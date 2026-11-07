"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Tag,
  UserRound,
} from "lucide-react";
import { signupParticipant } from "@/lib/accountAuth";
import {
  normalizeMobileNumber,
  MOBILE_NUMBER_MESSAGE,
} from "@/lib/mobileNumber";

import ParticipantNameFields from "@/app/components/ParticipantNameFields";
import {
  normalizeParticipantName,
  validateParticipantName,
  participantFullName,
  type NameField,
} from "@/lib/participantName";

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

const categories = [
  { value: "farmer", label: "Farmer" },
  { value: "fisherman", label: "Fisherman" },
  { value: "senior_citizen", label: "Senior Citizen" },
  { value: "4ps", label: "4Ps Beneficiary" },
  { value: "others", label: "Others" },
] as const;

type ParticipantCategory = "" | (typeof categories)[number]["value"];

const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

const selectClass =
  "h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

const labelClass = "mb-2 block text-sm font-medium text-slate-700";

const iconClass =
  "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400";

const chevronClass =
  "pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400";

const visibilityButtonClass =
  "absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function SignupPage() {
  const router = useRouter();
  const successDialogRef = useRef<HTMLDialogElement>(null);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [showNameErrors, setShowNameErrors] = useState(false);
  const nameValues = {
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    suffix,
  };
  const changeName = (field: NameField, value: string) => {
    ({
      first_name: setFirstName,
      middle_name: setMiddleName,
      last_name: setLastName,
      suffix: setSuffix,
    })[field](value);
    setErrorMessage(null);
  };
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [participantCategory, setParticipantCategory] =
    useState<ParticipantCategory>("");
  const [participantCategoryOther, setParticipantCategoryOther] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage && !successDialogRef.current?.open) {
      successDialogRef.current?.showModal();
    }
  }, [successMessage]);

  const fullName = participantFullName(nameValues);

  const passwordRequirements = [
    {
      label: "8–16 characters",
      met: password.length >= 8 && password.length <= 16,
    },
    {
      label: "At least one uppercase letter (A–Z)",
      met: /[A-Z]/.test(password),
    },
    {
      label: "At least one lowercase letter (a–z)",
      met: /[a-z]/.test(password),
    },
    {
      label: "At least one number (0–9)",
      met: /[0-9]/.test(password),
    },
    {
      label: "At least one special character (e.g. !@#$%)",
      met: /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/.test(password),
    },
  ];

  const passwordIsStrong = passwordRequirements.every(
    (requirement) => requirement.met,
  );

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const isOtherCategory = participantCategory === "others";

  const signupDisabled =
    loading || Boolean(successMessage) || !passwordIsStrong || !passwordsMatch;

  const clearError = () => setErrorMessage(null);

  const validateForm = () => {
    let message = "";

    setShowNameErrors(true);
    const nameErrors = validateParticipantName(nameValues);
    if (Object.keys(nameErrors).length) {
      setErrorMessage("Please correct the highlighted name fields.");
      const field = Object.keys(nameErrors)[0];
      document
        .getElementById(
          field === "suffix"
            ? "participant-custom-suffix"
            : `participant-${field}`,
        )
        ?.focus();
      return false;
    }
    if (!email.trim()) {
      message = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      message = "Please enter a valid email address.";
    } else if (mobileNumber.trim() && !normalizeMobileNumber(mobileNumber)) {
      message = MOBILE_NUMBER_MESSAGE;
    } else if (!municipalities.includes(municipality)) {
      message = "Please select your municipality.";
    } else if (!categories.some((item) => item.value === participantCategory)) {
      message = "Please select your participant category.";
    } else if (isOtherCategory && !participantCategoryOther.trim()) {
      message = "Please specify your participant category.";
    } else if (
      isOtherCategory &&
      participantCategoryOther.trim().length > 100
    ) {
      message =
        "Participant category description must not exceed 100 characters.";
    } else if (!password) {
      message = "Please enter a password.";
    } else if (!passwordIsStrong) {
      message =
        "Password must be 8–16 characters and include an uppercase letter, a lowercase letter, a number, and a special character.";
    } else if (!confirmPassword) {
      message = "Please confirm your password.";
    } else if (!passwordsMatch) {
      message = "Passwords do not match.";
    }

    if (message) {
      setErrorMessage(message);
      return false;
    }

    return true;
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading || successMessage) return;

    setErrorMessage(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error } = await signupParticipant({
        email: email.trim(),
        password,
        options: {
          data: {
            mobile_number: mobileNumber.trim()
              ? normalizeMobileNumber(mobileNumber)
              : null,
            ...normalizeParticipantName(nameValues),
            full_name: fullName,
            role: "participant",
            municipality,
            participant_category: participantCategory,
            participant_category_other: isOtherCategory
              ? participantCategoryOther.trim()
              : null,
          },
        },
      });

      if (error) {
        const message = error.message.toLowerCase();

        setErrorMessage(
          message.includes("already registered") ||
            message.includes("already been registered")
            ? "An account with this email already exists. Please sign in instead."
            : error.message,
        );

        return;
      }

      setSuccessMessage(
        "Account created successfully! Please check your email and verify your account before logging in.",
      );
    } catch (error) {
      console.error("Signup error:", error);

      setErrorMessage(
        "An unexpected error occurred while creating your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/pagtipon-bg.png')",
        }}
      />
      <div className="fixed inset-0 bg-slate-950/65" />
      <div className="fixed inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/45" />
      <div className="pointer-events-none fixed -left-40 top-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none fixed -right-40 bottom-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
              <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
            </div>

            <div>
              <p className="text-xl font-bold tracking-tight">PagTipon</p>
              <p className="hidden text-xs text-slate-300 sm:block">
                Event Management System
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </header>

        <section className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-5 py-3 sm:px-8 lg:px-10 xl:grid-cols-[0.75fr_1.25fr] xl:items-start xl:py-4">
          <div className="hidden pt-5 xl:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur-md">
              <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              Province of Antique
            </div>

            <h1 className="mt-6 max-w-xl text-5xl font-bold leading-tight tracking-tight text-white">
              Join the
              <span className="block text-emerald-400">
                PagTipon community.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Create your participant account to join provincial and municipal
              events, access your attendance pass, and track your attendance.
            </p>

            <div className="mt-8 max-w-lg space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Participant access
                  </p>
                  <p className="text-xs leading-5 text-slate-400">
                    Register for available events in your municipality.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Your attendance pass
                  </p>
                  <p className="text-xs leading-5 text-slate-400">
                    Access your QR code and manual code after registering for an
                    event.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Stay connected
                  </p>
                  <p className="text-xs leading-5 text-slate-400">
                    View event updates, registrations, and attendance history.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-3xl xl:mx-0">
            <div className="mb-6 text-center xl:hidden">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/30">
                <UserRound className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-white">
                Create your participant account
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Join the PagTipon community
              </p>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
              <div className="hidden xl:block">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-950/20">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                  Create your participant account
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Register to participate in provincial and municipal events.
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
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

              {successMessage && (
                <div
                  role="status"
                  className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                >
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-5 text-emerald-700">
                    {successMessage}
                  </p>
                </div>
              )}

              <form onSubmit={handleSignup} className="mt-6" noValidate>
                <fieldset
                  disabled={loading || Boolean(successMessage)}
                  className="space-y-4"
                >
                  <ParticipantNameFields
                    value={nameValues}
                    onChange={changeName}
                    showErrors={showNameErrors}
                    disabled={loading || Boolean(successMessage)}
                  />

                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className={iconClass} aria-hidden="true" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="you\@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearError();
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="mobileNumber" className={labelClass}>
                      Mobile Number{" "}
                      <span className="text-xs font-normal text-slate-400">
                        (optional)
                      </span>
                    </label>
                    <div className="relative">
                      <Phone className={iconClass} aria-hidden="true" />
                      <input
                        id="mobileNumber"
                        name="mobileNumber"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="0917 123 4567"
                        maxLength={24}
                        value={mobileNumber}
                        onChange={(event) => {
                          setMobileNumber(event.target.value);
                          clearError();
                        }}
                        onBlur={() => {
                          const normalized =
                            normalizeMobileNumber(mobileNumber);
                          if (normalized) setMobileNumber(normalized);
                        }}
                        aria-describedby="mobile-number-help"
                        className={inputClass}
                      />
                    </div>
                    <p
                      id="mobile-number-help"
                      className="mt-2 text-xs leading-5 text-slate-500"
                    >
                      For future SMS event updates. Use a Philippine mobile
                      number you control. SMS verification and messaging are not
                      enabled yet.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="municipality" className={labelClass}>
                        Municipality
                      </label>
                      <div className="relative">
                        <MapPin className={iconClass} aria-hidden="true" />
                        <select
                          id="municipality"
                          value={municipality}
                          onChange={(e) => {
                            setMunicipality(e.target.value);
                            clearError();
                          }}
                          className={selectClass}
                        >
                          <option value="">Select municipality</option>
                          {municipalities.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className={chevronClass}
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="participantCategory"
                        className={labelClass}
                      >
                        Participant Category
                      </label>
                      <div className="relative">
                        <Tag className={iconClass} aria-hidden="true" />
                        <select
                          id="participantCategory"
                          value={participantCategory}
                          onChange={(e) => {
                            const category = e.target
                              .value as ParticipantCategory;
                            setParticipantCategory(category);

                            if (category !== "others") {
                              setParticipantCategoryOther("");
                            }

                            clearError();
                          }}
                          className={selectClass}
                        >
                          <option value="">Select participant category</option>
                          {categories.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className={chevronClass}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-5 text-slate-400">
                    This information helps categorize participant attendance and
                    event participation.
                  </p>

                  {isOtherCategory && (
                    <div>
                      <label
                        htmlFor="participantCategoryOther"
                        className={labelClass}
                      >
                        Please specify
                      </label>
                      <input
                        id="participantCategoryOther"
                        type="text"
                        maxLength={100}
                        placeholder="Enter your participant category"
                        value={participantCategoryOther}
                        onChange={(e) => {
                          setParticipantCategoryOther(e.target.value);
                          clearError();
                        }}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      />
                      <p className="mt-1.5 text-right text-xs text-slate-400">
                        {participantCategoryOther.length}/100
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="password" className={labelClass}>
                        Password
                      </label>
                      <div className="relative">
                        <LockKeyhole className={iconClass} aria-hidden="true" />
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Create a strong password"
                          minLength={8}
                          maxLength={16}
                          aria-describedby="password-requirements password-counter"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            clearError();
                          }}
                          className={`${inputClass} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          aria-pressed={showPassword}
                          className={visibilityButtonClass}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>

                      <p
                        id="password-counter"
                        className="mt-1.5 text-right text-xs text-slate-400"
                      >
                        {password.length}/16 characters
                      </p>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className={labelClass}>
                        Confirm Password
                      </label>
                      <div className="relative">
                        <LockKeyhole className={iconClass} aria-hidden="true" />
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Confirm password"
                          minLength={8}
                          maxLength={16}
                          aria-describedby={
                            confirmPassword
                              ? "confirm-password-counter password-match-message"
                              : "confirm-password-counter"
                          }
                          aria-invalid={
                            confirmPassword.length > 0 && !passwordsMatch
                          }
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            clearError();
                          }}
                          className={`${inputClass} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((current) => !current)
                          }
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirmation password"
                              : "Show confirmation password"
                          }
                          aria-pressed={showConfirmPassword}
                          className={visibilityButtonClass}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>

                      <p
                        id="confirm-password-counter"
                        className="mt-1.5 text-right text-xs text-slate-400"
                      >
                        {confirmPassword.length}/16 characters
                      </p>

                      {confirmPassword && (
                        <p
                          id="password-match-message"
                          className={`mt-1.5 text-xs ${
                            passwordsMatch ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {passwordsMatch
                            ? "Passwords match"
                            : "Passwords do not match"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    id="password-requirements"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="mb-2 text-xs font-semibold text-slate-700">
                      Password requirements
                    </p>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {passwordRequirements.map((requirement) => (
                        <li
                          key={requirement.label}
                          className={`flex items-start gap-2 text-xs ${
                            requirement.met
                              ? "text-emerald-700"
                              : "text-slate-500"
                          }`}
                        >
                          <CheckCircle2
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                              requirement.met
                                ? "text-emerald-600"
                                : "text-slate-300"
                            }`}
                            aria-hidden="true"
                          />
                          <span>
                            <span className="sr-only">
                              {requirement.met ? "Met: " : "Not yet met: "}
                            </span>
                            {requirement.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={signupDisabled}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        Creating account...
                      </>
                    ) : successMessage ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Registration submitted
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </fieldset>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-emerald-600 transition hover:text-emerald-700 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-slate-300">
              Provincial and municipal event coordination platform
            </p>
          </div>
        </section>

        <footer className="mt-4 border-t border-white/10">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-5 py-4 text-center text-xs text-slate-400 sm:flex-row sm:px-8 lg:px-10">
            <p>© {new Date().getFullYear()} PagTipon. All rights reserved.</p>
            <p>Province of Antique Event Management System</p>
          </div>
        </footer>
      </div>
      <dialog
        ref={successDialogRef}
        aria-labelledby="signup-success-title"
        aria-describedby="signup-success-description"
        onCancel={(event) => event.preventDefault()}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 bg-white p-6 text-center shadow-2xl backdrop:bg-slate-950/70"
      >
        <CheckCircle2
          className="mx-auto h-12 w-12 text-emerald-600"
          aria-hidden="true"
        />
        <h2
          id="signup-success-title"
          className="mt-4 text-xl font-bold text-slate-950"
        >
          Account created successfully!
        </h2>
        <p
          id="signup-success-description"
          className="mt-3 text-sm leading-6 text-slate-600"
        >
          Please check your email and click the verification link before logging
          in.
        </p>
        <button
          type="button"
          autoFocus
          onClick={() => router.push("/login")}
          className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
        >
          Proceed to Login
        </button>
      </dialog>
    </main>
  );
}
