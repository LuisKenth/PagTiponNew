import type { ReactNode } from "react";

import ParticipantSidebar from "./components/ParticipantSidebar";

type ParticipantLayoutProps = {
    children: ReactNode;
};

export default function ParticipantLayout({
    children,
}: ParticipantLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-100">
            <ParticipantSidebar />

            <div className="lg:pl-72">
                <div className="min-h-screen">
                    {children}
                </div>
            </div>
        </div>
    );
}