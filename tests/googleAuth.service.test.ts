/**
 * Tests for the link-or-create branches of loginOrSignupWithGoogle.
 *
 * The Google token verification step is injected as a stub so we never
 * actually contact Google. The User model is mocked with an in-memory
 * store keyed on id so we can exercise findOne/save/create.
 */

process.env.DATABASE_URL = "postgres://test";
process.env.JWT_SECRET = "test_secret_for_unit_tests_only";
process.env.NODE_ENV = "test";

type FakeUser = {
  id: string;
  email: string;
  passwordHash: string | null;
  googleSub: string | null;
  save: jest.Mock;
};

const store: FakeUser[] = [];

function makeUser(partial: Partial<FakeUser>): FakeUser {
  const u: FakeUser = {
    id: partial.id ?? `user-${store.length + 1}`,
    email: partial.email ?? "",
    passwordHash: partial.passwordHash ?? null,
    googleSub: partial.googleSub ?? null,
    save: jest.fn(async () => {}),
  };
  return u;
}

jest.mock("../src/models", () => ({
  User: {
    findOne: jest.fn(async (opts: { where: Record<string, unknown> }) => {
      const w = opts.where;
      return (
        store.find(
          (u) =>
            (w.googleSub === undefined || u.googleSub === w.googleSub) &&
            (w.email === undefined || u.email === w.email)
        ) ?? null
      );
    }),
    create: jest.fn(async (data: Partial<FakeUser>) => {
      const u = makeUser(data);
      store.push(u);
      return u;
    }),
  },
}));

import {
  loginOrSignupWithGoogle,
  type GoogleVerifyFn,
} from "../src/services/auth.service";

const fakePayload = (email: string, sub: string, verified = true) => ({
  sub,
  email,
  email_verified: verified,
});

const verifyOk = (email: string, sub: string): GoogleVerifyFn =>
  (async () => fakePayload(email, sub)) as unknown as GoogleVerifyFn;

beforeEach(() => {
  store.length = 0;
  jest.clearAllMocks();
});

describe("loginOrSignupWithGoogle", () => {
  it("creates a new user when the Google identity is unknown", async () => {
    const user = await loginOrSignupWithGoogle(
      "any-token",
      verifyOk("new@example.com", "google-sub-1")
    );
    expect(user.email).toBe("new@example.com");
    expect(user.googleSub).toBe("google-sub-1");
    expect(user.passwordHash).toBeNull();
    expect(store).toHaveLength(1);
  });

  it("logs in an existing Google user without modification", async () => {
    store.push(
      makeUser({
        id: "existing",
        email: "g@example.com",
        googleSub: "sub-existing",
      })
    );
    const user = await loginOrSignupWithGoogle(
      "tok",
      verifyOk("g@example.com", "sub-existing")
    );
    expect(user.id).toBe("existing");
    expect(user.save).not.toHaveBeenCalled();
  });

  it("links a Google account to an existing email/password user", async () => {
    const existing = makeUser({
      id: "pw-user",
      email: "linked@example.com",
      passwordHash: "$2a$12$hashhashhashhashhashhash",
      googleSub: null,
    });
    store.push(existing);

    const user = await loginOrSignupWithGoogle(
      "tok",
      verifyOk("linked@example.com", "sub-link")
    );
    expect(user.id).toBe("pw-user");
    expect(user.googleSub).toBe("sub-link");
    expect(user.passwordHash).toBe("$2a$12$hashhashhashhashhashhash");
    expect(existing.save).toHaveBeenCalledTimes(1);
  });

  it("rejects a Google token with email_verified=false", async () => {
    const verify: GoogleVerifyFn = (async () =>
      fakePayload(
        "unverified@example.com",
        "sub",
        false
      )) as unknown as GoogleVerifyFn;
    await expect(loginOrSignupWithGoogle("tok", verify)).rejects.toMatchObject({
      status: 401,
    });
    expect(store).toHaveLength(0);
  });

  it("rejects a token with no sub or email", async () => {
    const verify: GoogleVerifyFn = (async () =>
      ({ sub: undefined, email: undefined } as unknown as ReturnType<
        GoogleVerifyFn
      > extends Promise<infer R>
        ? R
        : never)) as unknown as GoogleVerifyFn;
    await expect(loginOrSignupWithGoogle("tok", verify)).rejects.toMatchObject({
      status: 401,
    });
  });
});
