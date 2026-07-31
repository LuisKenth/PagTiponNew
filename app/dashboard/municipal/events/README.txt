MUNICIPAL RECEIVED EVENTS MODULE

Copy this folder into:

app/dashboard/municipal/events/

Resulting structure:

events/
├── components/
│   ├── MunicipalEventsFilters.tsx
│   ├── MunicipalEventsHeader.tsx
│   ├── MunicipalEventsList.tsx
│   └── MunicipalEventsPagination.tsx
├── hooks/
│   └── useMunicipalEventsPage.ts
├── types/
│   └── municipalEvents.ts
├── utils/
│   └── municipalEventsUtils.ts
├── page.tsx
└── README.txt

This module reuses the existing files:

app/dashboard/municipal/components/PrepareEventModal.tsx
app/dashboard/municipal/components/ReceivedEventCard.tsx
app/dashboard/municipal/hooks/useMunicipalDashboard.ts
app/dashboard/municipal/types/municipalDashboard.ts

Do not create duplicate copies of those shared files inside the events folder.
