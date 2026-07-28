"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import MemoSummaryCards from "./components/MemoSummaryCards";
import MemoSearch from "./components/MemoSearch";
import MemoSort, {
  type MemoSortValue,
} from "./components/MemoSort";
import MemoTable from "./components/MemoTable";
import EventsWithoutMemo from "./components/EventsWithoutMemo";

import type {
  EventRow,
  MemoEvent,
  MunicipalityRow,
} from "./types";



export default function OfficialMemosPage() {
  const [events, setEvents] = useState<MemoEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  /*
   * SEARCH
   */
  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  /*
   * PAGINATION
   */
  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    pageSize,
    setPageSize,
  ] = useState(5);

  /*
   * FETCH MEMOS
   */
  const fetchMemos = async () => {
    setLoading(true);

    try {
      const {
        data: eventData,
        error: eventError,
      } = await supabase
        .from("events")
        .select(
          `
          id,
          title,
          memo_url,
          memo_filename,
          memo_uploaded_at,
          status,
          created_at
        `
        )
        .order("created_at", {
          ascending: false,
        });

      if (eventError) {
        throw eventError;
      }

      const normalizedEvents =
        (eventData || []) as EventRow[];

      if (
        normalizedEvents.length === 0
      ) {
        setEvents([]);
        return;
      }

      const eventIds =
        normalizedEvents.map(
          (event) => event.id
        );

      const {
        data: municipalityData,
        error: municipalityError,
      } = await supabase
        .from(
          "event_municipalities"
        )
        .select(
          "id, event_id, municipality"
        )
        .in(
          "event_id",
          eventIds
        );

      if (municipalityError) {
        throw municipalityError;
      }

      const municipalities =
        (municipalityData ||
          []) as MunicipalityRow[];

      const mappedEvents: MemoEvent[] =
        normalizedEvents.map(
          (event) => ({
            ...event,

            municipalities:
              municipalities.filter(
                (item) =>
                  item.event_id ===
                  event.id
              ),
          })
        );

      setEvents(mappedEvents);
    } catch (error) {
      console.error(
        "Official memos error:",
        error
      );

      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemos();
  }, []);

  /*
   * EVENTS WITH MEMO
   */
  const eventsWithMemo =
    useMemo(() => {
      return events.filter(
        (event) =>
          event.memo_url ||
          event.memo_filename
      );
    }, [events]);

  /*
   * EVENTS WITHOUT MEMO
   */
  const eventsWithoutMemo =
    useMemo(() => {
      return events.filter(
        (event) =>
          !event.memo_url &&
          !event.memo_filename
      );
    }, [events]);

  /*
   * SEARCHED MEMOS
   */
  const filteredMemos =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      if (!query) {
        return eventsWithMemo;
      }

      return eventsWithMemo.filter(
        (event) => {
          const title =
            event.title?.toLowerCase() ||
            "";

          const filename =
            event.memo_filename?.toLowerCase() ||
            "";

          const status =
            event.status?.toLowerCase() ||
            "";

          const municipalities =
            event.municipalities
              .map((item) =>
                item.municipality.toLowerCase()
              )
              .join(" ");

          return (
            title.includes(query) ||
            filename.includes(query) ||
            status.includes(query) ||
            municipalities.includes(query)
          );
        }
      );
    }, [
      eventsWithMemo,
      searchQuery,
    ]);


  /*
* SORTING
*/
  const [sortBy, setSortBy] =
    useState<MemoSortValue>("newest");

  /*
   * SORTED MEMOS
   */
  const sortedMemos = useMemo(() => {
    const memos = [...filteredMemos];

    switch (sortBy) {
      case "oldest":
        return memos.sort((a, b) => {
          const dateA = a.created_at
            ? new Date(a.created_at).getTime()
            : 0;

          const dateB = b.created_at
            ? new Date(b.created_at).getTime()
            : 0;

          return dateA - dateB;
        });

      case "title-asc":
        return memos.sort((a, b) =>
          (a.title || "Untitled Event").localeCompare(
            b.title || "Untitled Event",
            "en",
            {
              sensitivity: "base",
            }
          )
        );

      case "title-desc":
        return memos.sort((a, b) =>
          (b.title || "Untitled Event").localeCompare(
            a.title || "Untitled Event",
            "en",
            {
              sensitivity: "base",
            }
          )
        );

      case "newest":
      default:
        return memos.sort((a, b) => {
          const dateA = a.created_at
            ? new Date(a.created_at).getTime()
            : 0;

          const dateB = b.created_at
            ? new Date(b.created_at).getTime()
            : 0;

          return dateB - dateA;
        });
    }
  }, [filteredMemos, sortBy]);

  /*
   * PAGINATION
   */
  const totalItems =
    sortedMemos.length;

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalItems /
      pageSize
    )
  );

  const paginatedMemos =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) * pageSize;

      const endIndex =
        startIndex + pageSize;

      return sortedMemos.slice(
        startIndex,
        endIndex
      );
    }, [
      sortedMemos,
      currentPage,
      pageSize,
    ]);

  /*
   * RESET TO PAGE 1
   * WHEN SEARCH CHANGES
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  /*
   * KEEP CURRENT PAGE VALID
   */
  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  /*
   * PAGE SIZE
   */
  const handlePageSizeChange = (
    size: number
  ) => {
    setPageSize(size);

    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <p className="text-sm font-medium text-slate-500">
          Provincial Admin
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Official Memos
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          View official memos uploaded and distributed
          with provincial events.
        </p>
      </div>

      {/* SUMMARY */}
      <MemoSummaryCards
        totalMemos={eventsWithMemo.length}
        totalWithoutMemo={eventsWithoutMemo.length}
        loading={loading}
      />

      {/* OFFICIAL MEMO LIST */}
      <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Official Memo List
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Memos attached to provincial events.
            </p>
          </div>

          <Link
            href="/dashboard/provincial/events/create"
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
          >
            Create Event
          </Link>
        </div>

        {/* SEARCH AND SORT */}
        {!loading &&
          eventsWithMemo.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-md">
                <MemoSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>

              <MemoSort
                value={sortBy}
                onChange={setSortBy}
              />
            </div>
          )}

        {/* TABLE */}
        <MemoTable
          memos={
            paginatedMemos
          }
          loading={loading}
          totalItems={
            totalItems
          }
          totalMemos={
            eventsWithMemo.length
          }
          currentPage={
            currentPage
          }
          totalPages={
            totalPages
          }
          pageSize={
            pageSize
          }
          searchQuery={
            searchQuery
          }
          onPageChange={
            setCurrentPage
          }
          onPageSizeChange={
            handlePageSizeChange
          }
        />
      </div>

      {/* EVENTS WITHOUT MEMO */}
      {!loading && (
        <EventsWithoutMemo
          events={
            eventsWithoutMemo
          }
        />
      )}
    </div>
  );
}