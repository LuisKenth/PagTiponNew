"use client";

import {
    AlertCircle,
    BadgeCheck,
    Building2,
    Loader2,
    Mail,
    Save,
    UserRound,
} from "lucide-react";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";

import { supabase } from "@/lib/supabase";

type ParticipantProfile = {
    id: string;
    full_name: string | null;
    email: string | null;
    municipality: string | null;
    role: string | null;
    verification_status: string | null;
    participant_category: string | null;
    participant_category_other: string | null;
};

const participantCategoryOptions = [
    {
        value: "farmer",
        label: "Farmer",
    },
    {
        value: "fisherfolk",
        label: "Fisherfolk",
    },
    {
        value: "agricultural_worker",
        label: "Agricultural Worker",
    },
    {
        value: "livestock_raiser",
        label: "Livestock Raiser",
    },
    {
        value: "entrepreneur",
        label: "Entrepreneur",
    },
    {
        value: "food_processor",
        label: "Food Processor",
    },
    {
        value: "agriculture_student",
        label: "Agriculture Student",
    },
    {
        value: "agriculture_professional",
        label: "Agriculture Professional",
    },
    {
        value: "government_employee",
        label: "Government Employee",
    },
    {
        value: "others",
        label: "Others",
    },
];

function normalizeText(
    value: string | null | undefined,
) {
    return (value ?? "")
        .trim()
        .replace(/\s+/g, " ");
}

function formatValue(
    value: string | null | undefined,
) {
    if (!value) {
        return "Not set";
    }

    return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase(),
        );
}

export default function ParticipantProfilePage() {
    const [profile, setProfile] =
        useState<ParticipantProfile | null>(
            null,
        );

    const [fullName, setFullName] =
        useState("");

    const [
        participantCategory,
        setParticipantCategory,
    ] = useState("");

    const [
        participantCategoryOther,
        setParticipantCategoryOther,
    ] = useState("");

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");

    const [
        successMessage,
        setSuccessMessage,
    ] = useState("");

    const fetchProfile =
        useCallback(async () => {
            setLoading(true);
            setErrorMessage("");
            setSuccessMessage("");

            try {
                const {
                    data: { user },
                    error: userError,
                } =
                    await supabase.auth.getUser();

                if (userError || !user) {
                    throw new Error(
                        userError?.message ||
                            "Participant account not found.",
                    );
                }

                const {
                    data,
                    error,
                } = await supabase
                    .from("profiles")
                    .select(
                        `
                            id,
                            full_name,
                            email,
                            municipality,
                            role,
                            verification_status,
                            participant_category,
                            participant_category_other
                        `,
                    )
                    .eq("id", user.id)
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                if (!data) {
                    throw new Error(
                        "Participant profile not found.",
                    );
                }

                const participantProfile =
                    data as ParticipantProfile;

                setProfile(
                    participantProfile,
                );

                setFullName(
                    participantProfile.full_name ??
                        "",
                );

                setParticipantCategory(
                    participantProfile.participant_category ??
                        "",
                );

                setParticipantCategoryOther(
                    participantProfile.participant_category_other ??
                        "",
                );
            } catch (error) {
                console.error(
                    "Participant profile fetch error:",
                    error,
                );

                setProfile(null);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to load participant profile.",
                );
            } finally {
                setLoading(false);
            }
        }, []);

    useEffect(() => {
        void fetchProfile();
    }, [fetchProfile]);

    const hasUnsavedChanges =
        useMemo(() => {
            if (!profile) {
                return false;
            }

            const currentFullName =
                normalizeText(fullName);

            const savedFullName =
                normalizeText(
                    profile.full_name,
                );

            const currentCategory =
                participantCategory.trim();

            const savedCategory =
                (
                    profile.participant_category ??
                    ""
                ).trim();

            const currentOtherCategory =
                currentCategory === "others"
                    ? normalizeText(
                          participantCategoryOther,
                      )
                    : "";

            const savedOtherCategory =
                savedCategory === "others"
                    ? normalizeText(
                          profile.participant_category_other,
                      )
                    : "";

            return (
                currentFullName !==
                    savedFullName ||
                currentCategory !==
                    savedCategory ||
                currentOtherCategory !==
                    savedOtherCategory
            );
        }, [
            profile,
            fullName,
            participantCategory,
            participantCategoryOther,
        ]);

    /*
     * Protect browser refresh, tab close,
     * and browser/window close.
     */
    useEffect(() => {
        if (!hasUnsavedChanges) {
            return;
        }

        const handleBeforeUnload = (
            event: BeforeUnloadEvent,
        ) => {
            event.preventDefault();

            event.returnValue = "";
        };

        window.addEventListener(
            "beforeunload",
            handleBeforeUnload,
        );

        return () => {
            window.removeEventListener(
                "beforeunload",
                handleBeforeUnload,
            );
        };
    }, [hasUnsavedChanges]);

    /*
     * Protect Next.js links such as the
     * participant sidebar navigation.
     */
    useEffect(() => {
        if (!hasUnsavedChanges) {
            return;
        }

        const handleLinkClick = (
            event: MouseEvent,
        ) => {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const target =
                event.target as HTMLElement | null;

            const anchor =
                target?.closest("a");

            if (
                !(anchor instanceof
                    HTMLAnchorElement)
            ) {
                return;
            }

            if (
                anchor.target === "_blank" ||
                anchor.hasAttribute(
                    "download",
                )
            ) {
                return;
            }

            const href =
                anchor.getAttribute("href");

            if (
                !href ||
                href.startsWith("#") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:")
            ) {
                return;
            }

            const currentUrl =
                new URL(
                    window.location.href,
                );

            const destinationUrl =
                new URL(
                    anchor.href,
                    window.location.href,
                );

            if (
                destinationUrl.href ===
                currentUrl.href
            ) {
                return;
            }

            const shouldLeave =
                window.confirm(
                    "You have unsaved profile changes. Leave this page without saving?",
                );

            if (!shouldLeave) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }
        };

        document.addEventListener(
            "click",
            handleLinkClick,
            true,
        );

        return () => {
            document.removeEventListener(
                "click",
                handleLinkClick,
                true,
            );
        };
    }, [hasUnsavedChanges]);

    const handleParticipantCategoryChange = (
        value: string,
    ) => {
        setParticipantCategory(value);

        if (value !== "others") {
            setParticipantCategoryOther("");
        }

        setErrorMessage("");
        setSuccessMessage("");
    };

    const handleSave = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (!profile) {
            return;
        }

        const normalizedFullName =
            normalizeText(fullName);

        const normalizedParticipantCategory =
            participantCategory.trim();

        const normalizedParticipantCategoryOther =
            normalizeText(
                participantCategoryOther,
            );

        if (!normalizedFullName) {
            setSuccessMessage("");

            setErrorMessage(
                "Full name is required.",
            );

            return;
        }

        const validParticipantCategory =
            participantCategoryOptions.some(
                (option) =>
                    option.value ===
                    normalizedParticipantCategory,
            );

        if (
            !normalizedParticipantCategory ||
            !validParticipantCategory
        ) {
            setSuccessMessage("");

            setErrorMessage(
                "Please select a valid participant category.",
            );

            return;
        }

        if (
            normalizedParticipantCategory ===
                "others" &&
            !normalizedParticipantCategoryOther
        ) {
            setSuccessMessage("");

            setErrorMessage(
                "Please specify your participant category.",
            );

            return;
        }

        setSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const {
                data: { user },
                error: userError,
            } =
                await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    userError?.message ||
                        "Participant account not found.",
                );
            }

            const {
                data,
                error,
            } = await supabase
                .from("profiles")
                .update({
                    full_name:
                        normalizedFullName,

                    participant_category:
                        normalizedParticipantCategory,

                    participant_category_other:
                        normalizedParticipantCategory ===
                        "others"
                            ? normalizedParticipantCategoryOther
                            : null,
                })
                .eq("id", user.id)
                .select(
                    `
                        id,
                        full_name,
                        email,
                        municipality,
                        role,
                        verification_status,
                        participant_category,
                        participant_category_other
                    `,
                )
                .single();

            if (error) {
                throw error;
            }

            const updatedProfile =
                data as ParticipantProfile;

            /*
             * Updating profile here also
             * resets hasUnsavedChanges because
             * this becomes the new saved state.
             */
            setProfile(
                updatedProfile,
            );

            setFullName(
                updatedProfile.full_name ??
                    "",
            );

            setParticipantCategory(
                updatedProfile.participant_category ??
                    "",
            );

            setParticipantCategoryOther(
                updatedProfile.participant_category_other ??
                    "",
            );

            setSuccessMessage(
                "Profile updated successfully.",
            );
        } catch (error) {
            console.error(
                "Participant profile update error:",
                error,
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to update participant profile.",
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className="p-4 sm:p-6 lg:p-8">
                <div className="mx-auto flex min-h-[420px] max-w-5xl items-center justify-center">
                    <div className="text-center">
                        <Loader2
                            className="mx-auto size-8 animate-spin text-slate-500"
                            aria-hidden="true"
                        />

                        <p className="mt-3 text-sm text-slate-500">
                            Loading participant
                            profile...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Participant Account
                    </p>

                    <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                        My Profile
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        View your participant
                        information and keep your
                        profile details up to date.
                    </p>
                </section>

                {errorMessage && (
                    <div
                        role="alert"
                        className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                    >
                        <AlertCircle
                            className="mt-0.5 size-5 shrink-0 text-red-600"
                            aria-hidden="true"
                        />

                        <div>
                            <p className="text-sm font-semibold text-red-800">
                                Unable to complete
                                request
                            </p>

                            <p className="mt-1 text-sm text-red-700">
                                {errorMessage}
                            </p>
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div
                        role="status"
                        className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4"
                    >
                        <BadgeCheck
                            className="mt-0.5 size-5 shrink-0 text-green-600"
                            aria-hidden="true"
                        />

                        <p className="text-sm font-medium text-green-800">
                            {successMessage}
                        </p>
                    </div>
                )}

                {profile && (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
                        <form
                            onSubmit={handleSave}
                            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-950">
                                        Profile Information
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Update your name
                                        and participant
                                        category.
                                    </p>
                                </div>

                                {hasUnsavedChanges && (
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                        Unsaved changes
                                    </span>
                                )}
                            </div>

                            <div className="mt-6 space-y-5">
                                <div>
                                    <label
                                        htmlFor="full-name"
                                        className="text-sm font-semibold text-slate-700"
                                    >
                                        Full Name
                                    </label>

                                    <input
                                        id="full-name"
                                        type="text"
                                        value={fullName}
                                        onChange={(
                                            event,
                                        ) => {
                                            setFullName(
                                                event
                                                    .target
                                                    .value,
                                            );

                                            setErrorMessage(
                                                "",
                                            );

                                            setSuccessMessage(
                                                "",
                                            );
                                        }}
                                        disabled={
                                            saving
                                        }
                                        maxLength={
                                            120
                                        }
                                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700">
                                        Email Address
                                    </label>

                                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                                        <Mail
                                            className="size-4 shrink-0 text-slate-400"
                                            aria-hidden="true"
                                        />

                                        <p className="min-w-0 truncate text-sm text-slate-700">
                                            {profile.email ||
                                                "Not set"}
                                        </p>
                                    </div>

                                    <p className="mt-1.5 text-xs text-slate-400">
                                        Email cannot be
                                        changed here.
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700">
                                        Municipality
                                    </label>

                                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                                        <Building2
                                            className="size-4 shrink-0 text-slate-400"
                                            aria-hidden="true"
                                        />

                                        <p className="text-sm text-slate-700">
                                            {profile.municipality ||
                                                "Not set"}
                                        </p>
                                    </div>

                                    <p className="mt-1.5 text-xs text-slate-400">
                                        Municipality is
                                        assigned to your
                                        participant account.
                                    </p>
                                </div>

                                <div>
                                    <label
                                        htmlFor="participant-category"
                                        className="text-sm font-semibold text-slate-700"
                                    >
                                        Participant Category
                                    </label>

                                    <select
                                        id="participant-category"
                                        value={
                                            participantCategory
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            handleParticipantCategoryChange(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                    >
                                        <option value="">
                                            Select participant
                                            category
                                        </option>

                                        {participantCategoryOptions.map(
                                            (
                                                option,
                                            ) => (
                                                <option
                                                    key={
                                                        option.value
                                                    }
                                                    value={
                                                        option.value
                                                    }
                                                >
                                                    {
                                                        option.label
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>

                                    <p className="mt-1.5 text-xs text-slate-400">
                                        Select the category
                                        that best describes
                                        your participation.
                                    </p>
                                </div>

                                {participantCategory ===
                                    "others" && (
                                    <div>
                                        <label
                                            htmlFor="participant-category-other"
                                            className="text-sm font-semibold text-slate-700"
                                        >
                                            Specify Category
                                        </label>

                                        <input
                                            id="participant-category-other"
                                            type="text"
                                            value={
                                                participantCategoryOther
                                            }
                                            onChange={(
                                                event,
                                            ) => {
                                                setParticipantCategoryOther(
                                                    event
                                                        .target
                                                        .value,
                                                );

                                                setErrorMessage(
                                                    "",
                                                );

                                                setSuccessMessage(
                                                    "",
                                                );
                                            }}
                                            disabled={
                                                saving
                                            }
                                            maxLength={
                                                100
                                            }
                                            placeholder="Enter your participant category"
                                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                        />

                                        <p className="mt-1.5 text-xs text-slate-400">
                                            Specify your
                                            category if it
                                            is not included
                                            in the list
                                            above.
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-slate-500">
                                        {hasUnsavedChanges
                                            ? "You have changes that have not been saved."
                                            : "Your profile information is up to date."}
                                    </p>

                                    <button
                                        type="submit"
                                        disabled={
                                            saving ||
                                            !hasUnsavedChanges
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <Loader2
                                                className="size-4 animate-spin"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <Save
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        )}

                                        {saving
                                            ? "Saving..."
                                            : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="space-y-6">
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <UserRound
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </div>

                                <h2 className="mt-4 text-lg font-semibold text-slate-950">
                                    Participant Category
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Category recorded for
                                    your participant
                                    account.
                                </p>

                                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Category
                                    </p>

                                    <p className="mt-1 font-semibold text-slate-900">
                                        {formatValue(
                                            profile.participant_category,
                                        )}
                                    </p>

                                    {profile.participant_category ===
                                        "others" &&
                                        profile.participant_category_other && (
                                            <>
                                                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                    Specified
                                                    Category
                                                </p>

                                                <p className="mt-1 text-sm font-medium text-slate-800">
                                                    {
                                                        profile.participant_category_other
                                                    }
                                                </p>
                                            </>
                                        )}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-950">
                                    Account Status
                                </h2>

                                <div className="mt-5 space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Role
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {formatValue(
                                                profile.role,
                                            )}
                                        </p>
                                    </div>

                                    <div className="border-t border-slate-100 pt-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Verification
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {formatValue(
                                                profile.verification_status,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}