export type EventRow = {
    id: string;
    title: string | null;
    memo_url: string | null;
    memo_filename: string | null;
    memo_uploaded_at: string | null;
    status: string | null;
    created_at: string | null;
};

export type MunicipalityRow = {
    id: string;
    event_id: string;
    municipality: string;
};

export type MemoEvent = EventRow & {
    municipalities: MunicipalityRow[];
};