"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  Tag,
  UserRound,
  UsersRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

const municipalities = [
  "Anini-y",
  "Barbaza",
  "Belison",
  "Bugasong",
  "Caluya",
  "Culasi",
  "Hamtic",
  "Laua-an",
  "Libertad",
  "Pandan",
  "Patnongon",
  "San Jose de Buenavista",
  "San Remigio",
  "Sebaste",
  "Sibalom",
  "Tibiao",
  "Tobias Fornier",
  "Valderrama",
];

type SignupRole =
  | "participant"
  | "municipal_admin";

type ParticipantCategory =
  | ""
  | "farmer"
  | "fisherman"
  | "senior_citizen"
  | "4ps"
  | "others";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [municipality, setMunicipality] =
    useState("");

  const [role, setRole] =
    useState<SignupRole>("participant");

  const [
    participantCategory,
    setParticipantCategory,
  ] =
    useState<ParticipantCategory>("");

  const [
    participantCategoryOther,
    setParticipantCategoryOther,
  ] = useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const passwordLongEnough =
    password.length >= 6;

  const passwordsMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const isParticipant =
    role === "participant";

  const isOtherCategory =
    participantCategory === "others";

  useEffect(() => {
    if (!successMessage) return;

    const timeout =
      window.setTimeout(() => {
        router.push("/login");
      }, 1800);

    return () =>
      window.clearTimeout(timeout);
  }, [router, successMessage]);

  const clearError = () => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const validateForm = () => {
    const trimmedName =
      fullName.trim();

    const trimmedEmail =
      email.trim();

    const trimmedOther =
      participantCategoryOther.trim();

    if (!trimmedName) {
      setErrorMessage(
        "Please enter your full name."
      );
      return false;
    }

    if (trimmedName.length < 2) {
      setErrorMessage(
        "Please enter a valid full name."
      );
      return false;
    }

    if (!trimmedEmail) {
      setErrorMessage(
        "Please enter your email address."
      );
      return false;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(trimmedEmail)
    ) {
      setErrorMessage(
        "Please enter a valid email address."
      );
      return false;
    }

    if (!municipality) {
      setErrorMessage(
        "Please select your municipality."
      );
      return false;
    }

    if (
      isParticipant &&
      !participantCategory
    ) {
      setErrorMessage(
        "Please select your participant category."
      );
      return false;
    }

    if (
      isParticipant &&
      isOtherCategory &&
      !trimmedOther
    ) {
      setErrorMessage(
        "Please specify your participant category."
      );
      return false;
    }

    if (
      isParticipant &&
      isOtherCategory &&
      trimmedOther.length > 100
    ) {
      setErrorMessage(
        "Participant category description must not exceed 100 characters."
      );
      return false;
    }

    if (!password) {
      setErrorMessage(
        "Please enter a password."
      );
      return false;
    }

    if (!passwordLongEnough) {
      setErrorMessage(
        "Password must be at least 6 characters long."
      );
      return false;
    }

    if (!confirmPassword) {
      setErrorMessage(
        "Please confirm your password."
      );
      return false;
    }

    if (
      password !== confirmPassword
    ) {
      setErrorMessage(
        "Passwords do not match."
      );
      return false;
    }

    return true;
  };

  const handleSignup = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (
      loading ||
      successMessage
    ) {
      return;
    }

    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name:
                fullName.trim(),

              role,

              municipality,

              participant_category:
                isParticipant
                  ? participantCategory
                  : null,

              participant_category_other:
                isParticipant &&
                isOtherCategory
                  ? participantCategoryOther.trim()
                  : null,
            },
          },
        });

      if (error) {
        const message =
          error.message.toLowerCase();

        if (
          message.includes(
            "already registered"
          ) ||
          message.includes(
            "already been registered"
          )
        ) {
          setErrorMessage(
            "An account with this email already exists. Please sign in instead."
          );
        } else {
          setErrorMessage(
            error.message
          );
        }

        return;
      }

      if (
        role ===
        "municipal_admin"
      ) {
        setSuccessMessage(
          "Municipal admin account created. Your account is now pending provincial approval."
        );
      } else {
        setSuccessMessage(
          "Account created successfully. Redirecting you to the login page..."
        );
      }
    } catch (error) {
      console.error(
        "Signup error:",
        error
      );

      setErrorMessage(
        "An unexpected error occurred while creating your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8 sm:px-6">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-slate-200/70 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-slate-200/70 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Branding */}
        <div className="mb-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/10">
            <CalendarCheck2
              className="h-6 w-6 text-white"
              aria-hidden="true"
            />
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            PagTipon
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Integrated Event Operations
            and Attendance
          </p>
        </div>

        {/* Signup Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-7">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Create your account
            </h2>

            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Register as a participant
              or apply as a municipal
              administrator.
            </p>
          </div>

          {/* Error */}
          {errorMessage && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                aria-hidden="true"
              />

              <p className="text-sm leading-5 text-red-700">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Success */}
          {successMessage && (
            <div
              role="status"
              className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
            >
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />

              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Account created
                </p>

                <p className="mt-0.5 text-sm leading-5 text-emerald-700">
                  {successMessage}
                </p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSignup}
            className="mt-5"
            noValidate
          >
            <fieldset
              disabled={
                loading ||
                Boolean(
                  successMessage
                )
              }
              className="space-y-4"
            >
              {/* Name + Email */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Full Name
                  </label>

                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />

                    <input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(
                          e.target
                            .value
                        );
                        clearError();
                      }}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />

                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => {
                        setEmail(
                          e.target
                            .value
                        );
                        clearError();
                      }}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    />
                  </div>
                </div>
              </div>

              {/* Role + Municipality */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="role"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Account Type
                  </label>

                  <div className="relative">
                    <UsersRound
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />

                    <select
                      id="role"
                      value={role}
                      onChange={(e) => {
                        const selectedRole =
                          e.target
                            .value as SignupRole;

                        setRole(
                          selectedRole
                        );

                        if (
                          selectedRole ===
                          "municipal_admin"
                        ) {
                          setParticipantCategory(
                            ""
                          );

                          setParticipantCategoryOther(
                            ""
                          );
                        }

                        clearError();
                      }}
                      className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    >
                      <option value="participant">
                        Participant
                      </option>

                      <option value="municipal_admin">
                        Municipal Admin
                      </option>
                    </select>

                    <ChevronDown
                      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="municipality"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Municipality
                  </label>

                  <div className="relative">
                    <MapPin
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />

                    <select
                      id="municipality"
                      value={
                        municipality
                      }
                      onChange={(e) => {
                        setMunicipality(
                          e.target
                            .value
                        );
                        clearError();
                      }}
                      className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    >
                      <option value="">
                        Select municipality
                      </option>

                      {municipalities.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              {/* Participant Category */}
              {isParticipant && (
                <div>
                  <label
                    htmlFor="participantCategory"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Participant Category
                  </label>

                  <div className="relative">
                    <Tag
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />

                    <select
                      id="participantCategory"
                      value={
                        participantCategory
                      }
                      onChange={(e) => {
                        const category =
                          e.target
                            .value as ParticipantCategory;

                        setParticipantCategory(
                          category
                        );

                        if (
                          category !==
                          "others"
                        ) {
                          setParticipantCategoryOther(
                            ""
                          );
                        }

                        clearError();
                      }}
                      className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    >
                      <option value="">
                        Select participant
                        category
                      </option>

                      <option value="farmer">
                        Farmer
                      </option>

                      <option value="fisherman">
                        Fisherman
                      </option>

                      <option value="senior_citizen">
                        Senior Citizen
                      </option>

                      <option value="4ps">
                        4Ps Beneficiary
                      </option>

                      <option value="others">
                        Others
                      </option>
                    </select>

                    <ChevronDown
                      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                  </div>

                  <p className="mt-1.5 text-xs text-slate-400">
                    This information helps
                    categorize participant
                    attendance and event
                    participation.
                  </p>
                </div>
              )}

              {/* Others */}
              {isParticipant &&
                isOtherCategory && (
                  <div>
                    <label
                      htmlFor="participantCategoryOther"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Please specify
                    </label>

                    <input
                      id="participantCategoryOther"
                      type="text"
                      placeholder="Enter your participant category"
                      maxLength={100}
                      value={
                        participantCategoryOther
                      }
                      onChange={(e) => {
                        setParticipantCategoryOther(
                          e.target
                            .value
                        );
                        clearError();
                      }}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    />

                    <p className="mt-1.5 text-right text-xs text-slate-400">
                      {
                        participantCategoryOther.length
                      }
                      /100
                    </p>
                  </div>
                )}

              {/* Municipal Admin Notice */}
              {role ===
                "municipal_admin" && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />

                  <p className="text-sm leading-5 text-amber-800">
                    Municipal
                    administrator
                    accounts require
                    approval from the
                    provincial
                    administrator before
                    they can sign in.
                  </p>
                </div>
              )}

              {/* Passwords */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Create password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(
                          e.target
                            .value
                        );
                        clearError();
                      }}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      {showPassword ? (
                        <EyeOff
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${
                        passwordLongEnough
                          ? "text-emerald-600"
                          : "text-slate-300"
                      }`}
                      aria-hidden="true"
                    />

                    <span
                      className={`text-xs ${
                        passwordLongEnough
                          ? "text-emerald-700"
                          : "text-slate-400"
                      }`}
                    >
                      At least 6
                      characters
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Confirm Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      value={
                        confirmPassword
                      }
                      onChange={(e) => {
                        setConfirmPassword(
                          e.target
                            .value
                        );
                        clearError();
                      }}
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirmation password"
                          : "Show confirmation password"
                      }
                      className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      {showConfirmPassword ? (
                        <EyeOff
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </div>

                  {confirmPassword && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-emerald-600"
                            aria-hidden="true"
                          />

                          <span className="text-xs text-emerald-700">
                            Passwords
                            match
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle
                            className="h-3.5 w-3.5 text-red-500"
                            aria-hidden="true"
                          />

                          <span className="text-xs text-red-600">
                            Passwords do
                            not match
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  loading ||
                  Boolean(
                    successMessage
                  )
                }
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />

                    Creating
                    account...
                  </>
                ) : successMessage ? (
                  <>
                    <CheckCircle2
                      className="h-4 w-4"
                      aria-hidden="true"
                    />

                    Account created
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </fieldset>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-center text-sm text-slate-500">
              Already have an
              account?{" "}
              <Link
                href="/login"
                className="font-semibold text-slate-900 transition hover:text-slate-700 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-slate-400">
          Provincial and municipal event
          coordination platform
        </p>
      </div>
    </main>
  );
}