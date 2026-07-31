MUNICIPAL REGISTRATIONS MODULE

Copy this folder into:

app/dashboard/municipal/registrations/

Structure:

registrations/
├── components/
│   ├── EventRegistrationSummary.tsx
│   ├── RegistrationFilters.tsx
│   ├── RegistrationsHeader.tsx
│   ├── RegistrationsPagination.tsx
│   └── RegistrationsTable.tsx
├── hooks/
│   └── useMunicipalRegistrations.ts
├── types/
│   └── municipalRegistrations.ts
├── utils/
│   └── municipalRegistrationsUtils.ts
├── page.tsx
└── README.txt

REQUIRED DATABASE FUNCTION:

public.get_municipal_registrations(uuid)

The module never displays the full QR token.
It only shows whether a QR token exists.

Supported direct event URL:

/dashboard/municipal/registrations?eventMunicipalityId=<assignment-id>
