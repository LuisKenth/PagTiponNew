"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import { MUNICIPALITIES } from "../../constants/municipalities";
import type { MunicipalAdmin } from "../../types/municipality";
import { toMunicipalitySlug } from "../../utils/municipalityUtils";
import type {
    EventMunicipalityAssignment,
    MunicipalityDetailData,
    MunicipalityEventItem,
    ProvincialEvent,
} from "../types/municipalityDetails";

export default function useMunicipalityDetails(
    municipalitySlug: string
) {
    const [data, setData] =
        useState<MunicipalityDetailData | null>(null);

    const [loading, setLoading] = useState(true);

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null);

    const municipalityName = useMemo(() => {
        const normalizedSlug = municipalitySlug
            .trim()
            .toLowerCase();

        return (
            MUNICIPALITIES.find(
                (municipality) =>
                    toMunicipalitySlug(municipality) === normalizedSlug
            ) || null
        );
    }, [municipalitySlug]);

    useEffect(() => {
        let cancelled = false;

        const fetchMunicipalityDetails = async () => {
            setLoading(true);
            setErrorMessage(null);
            setData(null);

            if (!municipalityName) {
                setErrorMessage("Municipality not found.");
                setLoading(false);
                return;
            }

            try {
                const [adminsResult, assignmentsResult] =
                    await Promise.all([
                        supabase
                            .from("profiles")
                            .select(
                                `
                id,
                full_name,
                email,
                municipality,
                verification_status,
                created_at
              `
                            )
                            .eq("role", "municipal_admin")
                            .ilike("municipality", municipalityName)
                            .order("created_at", {
                                ascending: false,
                            }),

                        supabase
                            .from("event_municipalities")
                            .select(
                                `
                id,
                event_id,
                municipality,
                municipal_status
              `
                            )
                            .ilike("municipality", municipalityName)
                            .order("id", {
                                ascending: false,
                            }),
                    ]);

                if (cancelled) return;

                if (adminsResult.error) {
                    console.error(
                        "Municipal admins error:",
                        adminsResult.error.message
                    );

                    setErrorMessage(
                        `Unable to load municipal administrators: ${adminsResult.error.message}`
                    );

                    return;
                }

                if (assignmentsResult.error) {
                    console.error(
                        "Municipality events error:",
                        assignmentsResult.error.message
                    );

                    setErrorMessage(
                        `Unable to load municipality events: ${assignmentsResult.error.message}`
                    );

                    return;
                }

                const admins =
                    (adminsResult.data || []) as MunicipalAdmin[];

                const assignments =
                    (assignmentsResult.data ||
                        []) as EventMunicipalityAssignment[];

                const eventIds = Array.from(
                    new Set(
                        assignments
                            .map((assignment) => assignment.event_id)
                            .filter(
                                (eventId): eventId is string =>
                                    typeof eventId === "string" &&
                                    eventId.trim().length > 0
                            )
                    )
                );

                let provincialEvents: ProvincialEvent[] = [];

                if (eventIds.length > 0) {
                    const eventsResult = await supabase
                        .from("events")
                        .select(
                            `
              id,
              title,
              description,
              start_at,
              end_at,
              status,
              created_at
            `
                        )
                        .in("id", eventIds)
                        .neq("status", "draft")
                        .order("start_at", {
                            ascending: false,
                        });

                    if (cancelled) return;

                    if (eventsResult.error) {
                        console.error(
                            "Provincial events error:",
                            eventsResult.error.message
                        );

                        setErrorMessage(
                            `Unable to load provincial events: ${eventsResult.error.message}`
                        );

                        return;
                    }

                    provincialEvents =
                        (eventsResult.data || []) as ProvincialEvent[];
                }

                const eventsById = new Map(
                    provincialEvents.map((event) => [
                        event.id,
                        event,
                    ])
                );

                const municipalityEvents =
                    assignments
                        .flatMap<MunicipalityEventItem>(
                            (assignment) => {
                                const matchedEvent = eventsById.get(
                                    assignment.event_id
                                );

                                if (!matchedEvent) {
                                    return [];
                                }

                                return [
                                    {
                                        id: assignment.id,
                                        event_id: assignment.event_id,
                                        municipality:
                                            assignment.municipality,
                                        preparation_status:
                                            assignment.municipal_status ||
                                            "pending",
                                        event: matchedEvent,
                                    },
                                ];
                            }
                        )
                        .sort((firstItem, secondItem) => {
                            const firstDate =
                                firstItem.event?.start_at
                                    ? new Date(
                                        firstItem.event.start_at
                                    ).getTime()
                                    : 0;

                            const secondDate =
                                secondItem.event?.start_at
                                    ? new Date(
                                        secondItem.event.start_at
                                    ).getTime()
                                    : 0;

                            return secondDate - firstDate;
                        });

                if (cancelled) return;

                setData({
                    municipalityName,
                    admins,
                    events: municipalityEvents,
                });
            } catch (error) {
                if (cancelled) return;

                const message =
                    error instanceof Error
                        ? error.message
                        : "An unexpected error occurred.";

                console.error(
                    "Municipality details fetch error:",
                    error
                );

                setErrorMessage(
                    `Unable to load municipality details: ${message}`
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void fetchMunicipalityDetails();

        return () => {
            cancelled = true;
        };
    }, [municipalityName]);

    return {
        data,
        loading,
        errorMessage,
        municipalityName,
    };
}