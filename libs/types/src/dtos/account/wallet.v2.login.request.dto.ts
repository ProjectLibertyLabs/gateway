import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, ValidateIf } from 'class-validator';

export class WalletV2LoginRequestDto {
  @ApiPropertyOptional({
    description:
      'The code returned from the SIWF v2 Authentication service that can be exchanged for the payload. Required unless an `authorizationPayload` is provided.',
    type: String,
    example: '680a0a68-6d3b-4d6d-89b7-0b01a6f7e86f',
  })
  @ValidateIf((o) => !o.authorizationPayload)
  @IsNotEmpty()
  authorizationCode?: string;

  @ApiPropertyOptional({
    description:
      'The SIWF v2 Authentication payload as a JSON stringified and base64url encoded value. Required unless an `authorizationCode` is provided.',
    type: String,
    example: 'ew0KICAidXNlclB1YmxpY0tleSI6IHsNCiAgICAiZW5jb2RlZFZhbHVlIjogIjVIWUhaOGU4a3lMRUJ1RWJzRmEyYndLWWJWU01nYVVoeW1mUlZnSDdDdU00VkNIdiIsDQogICAgImVuY29kaW5nIjogImJhc2U1OCIsDQogICAgImZvcm1hdCI6ICJzczU4IiwNCiAgICAidHlwZSI6ICJTcjI1NTE5Ig0KICB9LA0KICAidXNlcktleXMiOiBbDQogICAgew0KICAgICAgImVuY29kZWRQdWJsaWNLZXlWYWx1ZSI6ICIweGJkODk2ZmQ1NTAxZWVhMjU5ZjQ3OTg0MTVjOWZhNDQ3ZDU4ODIwZDk5YjkyNDA2NzFhNmYzNGYwYmMwM2IwMzAiLA0KICAgICAgImVuY29kZWRQcml2YXRlS2V5VmFsdWUiOiAiMHhmODExNWQzZTUwYzg2MTYzODZmMDY2ZjY1OTdlZmYwYzU3MGQ2N2M3ZTVjZDkzNjU1Njg4NGJjYzk5NDNmNDY0IiwNCiAgICAgICJlbmNvZGluZyI6ICJiYXNlMTYiLA0KICAgICAgImZvcm1hdCI6ICJiYXJlIiwNCiAgICAgICJ0eXBlIjogIlgyNTUxOSIsDQogICAgICAia2V5VHlwZSI6ICJkc25wLnB1YmxpYy1rZXkta2V5LWFncmVlbWVudCINCiAgICB9DQogIF0sDQogICJwYXlsb2FkcyI6IFsNCiAgICB7DQogICAgICAic2lnbmF0dXJlIjogew0KICAgICAgICAiYWxnbyI6ICJTUjI1NTE5IiwNCiAgICAgICAgImVuY29kaW5nIjogImJhc2UxNiIsDQogICAgICAgICJlbmNvZGVkVmFsdWUiOiAiMHgzMmFlYWViZWZmNWU4ZTEzODM3ZTg3YzQ5MWI0Mzc4MTE1MjYxZWU3NTFjYmYzYTc1ZTY5MmJiNzFhMWNmYzU3ZGRkZDhhODliYjZiNTE3ZjBiNGMyOWI0ZmFlOGUyNjQxZjM2MTEwMWNjMzg5ZmU0OTFmNTQ0NTM0ODFkZmU4OSINCiAgICAgIH0sDQogICAgICAiZW5kcG9pbnQiOiB7DQogICAgICAgICJwYWxsZXQiOiAibXNhIiwNCiAgICAgICAgImV4dHJpbnNpYyI6ICJjcmVhdGVTcG9uc29yZWRBY2NvdW50V2l0aERlbGVnYXRpb24iDQogICAgICB9LA0KICAgICAgInR5cGUiOiAiYWRkUHJvdmlkZXIiLA0KICAgICAgInBheWxvYWQiOiB7DQogICAgICAgICJhdXRob3JpemVkTXNhSWQiOiA3MjksDQogICAgICAgICJzY2hlbWFJZHMiOiBbDQogICAgICAgICAgNiwNCiAgICAgICAgICA3LA0KICAgICAgICAgIDgsDQogICAgICAgICAgOSwNCiAgICAgICAgICAxMA0KICAgICAgICBdLA0KICAgICAgICAiZXhwaXJhdGlvbiI6IDE2MDc1MzgNCiAgICAgIH0NCiAgICB9LA0KICAgIHsNCiAgICAgICJzaWduYXR1cmUiOiB7DQogICAgICAgICJhbGdvIjogIlNSMjU1MTkiLA0KICAgICAgICAiZW5jb2RpbmciOiAiYmFzZTE2IiwNCiAgICAgICAgImVuY29kZWRWYWx1ZSI6ICIweDFhMGI1ZDdkNWNhNzg4Y2VmZDE4NDk3ZDc5NzJkYTk5YzQ3NmI3NTA0YzY5MzNiYzUyYTZkZTA2NWI5NGE3NTFmMzI5Mjg5N2QzMjEzODllOTAwZmQ1MmJmMzEyYzJiZGM3ODAwZWMwMzM2YmJmMTcyY2I3ZTE5ZjU1MjJlODg0Ig0KICAgICAgfSwNCiAgICAgICJlbmRwb2ludCI6IHsNCiAgICAgICAgInBhbGxldCI6ICJoYW5kbGVzIiwNCiAgICAgICAgImV4dHJpbnNpYyI6ICJjbGFpbUhhbmRsZSINCiAgICAgIH0sDQogICAgICAidHlwZSI6ICJjbGFpbUhhbmRsZSIsDQogICAgICAicGF5bG9hZCI6IHsNCiAgICAgICAgImJhc2VIYW5kbGUiOiAid2lsd2FkZSIsDQogICAgICAgICJleHBpcmF0aW9uIjogMTYwNzUzOA0KICAgICAgfQ0KICAgIH0sDQogICAgew0KICAgICAgInNpZ25hdHVyZSI6IHsNCiAgICAgICAgImFsZ28iOiAiU1IyNTUxOSIsDQogICAgICAgICJlbmNvZGluZyI6ICJiYXNlMTYiLA0KICAgICAgICAiZW5jb2RlZFZhbHVlIjogIjB4YTYxN2FhMzEzMDQzMjY1NWY2MjU1ZWQ5NTE5MGE0N2MzMTc1NTk2ZDIwODlkMmE0OGY0M2QyNTdhYWM5NzY0YWZmMmU5NDNmMmNmZThlOGEwMzBmN2RkNzMwODE5NTMyMTVkNzU2YTBiYmU5OGY3MjQ5OWIwMjk3YWY5ZmQ3ODIiDQogICAgICB9LA0KICAgICAgImVuZHBvaW50Ijogew0KICAgICAgICAicGFsbGV0IjogInN0YXRlZnVsU3RvcmFnZSIsDQogICAgICAgICJleHRyaW5zaWMiOiAiYXBwbHlJdGVtQWN0aW9uc1dpdGhTaWduYXR1cmVWMiINCiAgICAgIH0sDQogICAgICAidHlwZSI6ICJpdGVtQWN0aW9ucyIsDQogICAgICAicGF5bG9hZCI6IHsNCiAgICAgICAgInNjaGVtYUlkIjogNywNCiAgICAgICAgInRhcmdldEhhc2giOiAwLA0KICAgICAgICAiZXhwaXJhdGlvbiI6IDE2MDc1MzgsDQogICAgICAgICJhY3Rpb25zIjogWw0KICAgICAgICAgIHsNCiAgICAgICAgICAgICJ0eXBlIjogImFkZEl0ZW0iLA0KICAgICAgICAgICAgInBheWxvYWRIZXgiOiAiMHhiZDg5NmZkNTUwMWVlYTI1OWY0Nzk4NDE1YzlmYTQ0N2Q1ODgyMGQ5OWI5MjQwNjcxYTZmMzRmMGJjMDNiMDMwIg0KICAgICAgICAgIH0NCiAgICAgICAgXQ0KICAgICAgfQ0KICAgIH0NCiAgXSwNCiAgImNyZWRlbnRpYWxzIjogWw0KICAgIHsNCiAgICAgICJAY29udGV4dCI6IFsNCiAgICAgICAgImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiIsDQogICAgICAgICJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvdW5kZWZpbmVkLXRlcm1zL3YyIg0KICAgICAgXSwNCiAgICAgICJ0eXBlIjogWw0KICAgICAgICAiVmVyaWZpZWRFbWFpbEFkZHJlc3NDcmVkZW50aWFsIiwNCiAgICAgICAgIlZlcmlmaWFibGVDcmVkZW50aWFsIg0KICAgICAgXSwNCiAgICAgICJpc3N1ZXIiOiAiZGlkOndlYjp0ZXN0bmV0LmZyZXF1ZW5jeWFjY2Vzcy5jb20iLA0KICAgICAgInZhbGlkRnJvbSI6ICIyMDI0LTEwLTEwVDEyOjUyOjIyLjgzNyswMDAwIiwNCiAgICAgICJjcmVkZW50aWFsU2NoZW1hIjogew0KICAgICAgICAidHlwZSI6ICJKc29uU2NoZW1hIiwNCiAgICAgICAgImlkIjogImh0dHBzOi8vc2NoZW1hcy5mcmVxdWVuY3lhY2Nlc3MuY29tL1ZlcmlmaWVkRW1haWxBZGRyZXNzQ3JlZGVudGlhbC9iY2lxZTRxb2N6aGZ0aWNpNGR6ZnZmYmVsN2ZvNGg0c3I1Z3JjbzNvb3Z3eWs2eTR5bmY0NHRzaS5qc29uIg0KICAgICAgfSwNCiAgICAgICJjcmVkZW50aWFsU3ViamVjdCI6IHsNCiAgICAgICAgImlkIjogImRpZDprZXk6ejZRUDJKdlJ1WFo1d1g3N0tLOGRMOG84UWNDVm5IeTg4UnRnM2NzVXcxdFNEcGRnIiwNCiAgICAgICAgImVtYWlsQWRkcmVzcyI6ICJ3aWwud2FkZUBwcm9qZWN0bGliZXJ0eS5pbyIsDQogICAgICAgICJsYXN0VmVyaWZpZWQiOiAiMjAyNC0xMC0xMFQxMjo1MTowMi4yODMrMDAwMCINCiAgICAgIH0sDQogICAgICAicHJvb2YiOiB7DQogICAgICAgICJ0eXBlIjogIkRhdGFJbnRlZ3JpdHlQcm9vZiIsDQogICAgICAgICJ2ZXJpZmljYXRpb25NZXRob2QiOiAiZGlkOndlYjp0ZXN0bmV0LmZyZXF1ZW5jeWFjY2Vzcy5jb20jejZNa3c0eVg0YzJaM3NlU1NkblI5c3ZFTjZGdjdVa1U4anJOUE1rTXd0WkNvQVZHIiwNCiAgICAgICAgImNyeXB0b3N1aXRlIjogImVkZHNhLXJkZmMtMjAyMiIsDQogICAgICAgICJwcm9vZlB1cnBvc2UiOiAiYXNzZXJ0aW9uTWV0aG9kIiwNCiAgICAgICAgInByb29mVmFsdWUiOiAiejR2Y0RMdEpoY054dnZXY0F3VWNhMUs4YmFCSmNBa2JTcnBwdEhFVG1TZ0FhYjJkc2RkR0gxSjczTFQzc3czUkRjUzdWTE1HRkN1WWluNTNxVFRtNWM2TVAiDQogICAgICB9DQogICAgfSwNCiAgICB7DQogICAgICAiQGNvbnRleHQiOiBbDQogICAgICAgICJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvdjIiLA0KICAgICAgICAiaHR0cHM6Ly93d3cudzMub3JnL25zL2NyZWRlbnRpYWxzL3VuZGVmaW5lZC10ZXJtcy92MiINCiAgICAgIF0sDQogICAgICAidHlwZSI6IFsNCiAgICAgICAgIlZlcmlmaWVkR3JhcGhLZXlDcmVkZW50aWFsIiwNCiAgICAgICAgIlZlcmlmaWFibGVDcmVkZW50aWFsIg0KICAgICAgXSwNCiAgICAgICJpc3N1ZXIiOiAiZGlkOndlYjp0ZXN0bmV0LmZyZXF1ZW5jeWFjY2Vzcy5jb20iLA0KICAgICAgInZhbGlkRnJvbSI6ICIyMDI0LTEwLTEwVDEyOjUyOjIyLjgzOCswMDAwIiwNCiAgICAgICJjcmVkZW50aWFsU2NoZW1hIjogew0KICAgICAgICAidHlwZSI6ICJKc29uU2NoZW1hIiwNCiAgICAgICAgImlkIjogImh0dHBzOi8vc2NoZW1hcy5mcmVxdWVuY3lhY2Nlc3MuY29tL1ZlcmlmaWVkR3JhcGhLZXlDcmVkZW50aWFsL2JjaXFtZHZteGQ1NHp2ZTVraWZ5Y2dzZHRvYWhzNWVjZjRoYWwydHMzZWV4a2dvY3ljNW9jYTJ5Lmpzb24iDQogICAgICB9LA0KICAgICAgImNyZWRlbnRpYWxTdWJqZWN0Ijogew0KICAgICAgICAiaWQiOiAiZGlkOmtleTp6NlFQMkp2UnVYWjV3WDc3S0s4ZEw4bzhRY0NWbkh5ODhSdGczY3NVdzF0U0RwZGciLA0KICAgICAgICAiZW5jb2RlZFB1YmxpY0tleVZhbHVlIjogIjB4YmQ4OTZmZDU1MDFlZWEyNTlmNDc5ODQxNWM5ZmE0NDdkNTg4MjBkOTliOTI0MDY3MWE2ZjM0ZjBiYzAzYjAzMCIsDQogICAgICAgICJlbmNvZGVkUHJpdmF0ZUtleVZhbHVlIjogIjB4ZjgxMTVkM2U1MGM4NjE2Mzg2ZjA2NmY2NTk3ZWZmMGM1NzBkNjdjN2U1Y2Q5MzY1NTY4ODRiY2M5OTQzZjQ2NCIsDQogICAgICAgICJlbmNvZGluZyI6ICJiYXNlMTYiLA0KICAgICAgICAiZm9ybWF0IjogImJhcmUiLA0KICAgICAgICAidHlwZSI6ICJYMjU1MTkiLA0KICAgICAgICAia2V5VHlwZSI6ICJkc25wLnB1YmxpYy1rZXkta2V5LWFncmVlbWVudCINCiAgICAgIH0sDQogICAgICAicHJvb2YiOiB7DQogICAgICAgICJ0eXBlIjogIkRhdGFJbnRlZ3JpdHlQcm9vZiIsDQogICAgICAgICJ2ZXJpZmljYXRpb25NZXRob2QiOiAiZGlkOndlYjp0ZXN0bmV0LmZyZXF1ZW5jeWFjY2Vzcy5jb20jejZNa3c0eVg0YzJaM3NlU1NkblI5c3ZFTjZGdjdVa1U4anJOUE1rTXd0WkNvQVZHIiwNCiAgICAgICAgImNyeXB0b3N1aXRlIjogImVkZHNhLXJkZmMtMjAyMiIsDQogICAgICAgICJwcm9vZlB1cnBvc2UiOiAiYXNzZXJ0aW9uTWV0aG9kIiwNCiAgICAgICAgInByb29mVmFsdWUiOiAiejI5YWRmdG5lSG5LeHdSOWI3Z3RSanlrTFJlR0VwdU1pWTljS0hWQ0JTejZtWThjd0ZaaUZpQVdaSGV4R3R2Qjh0YmRwZmoyRzQzeFF6dFJ6dFdhd21IRjIiDQogICAgICB9DQogICAgfQ0KICBdDQp9',
  })
  @ValidateIf((o) => !o.authorizationCode)
  @IsNotEmpty()
  authorizationPayload?: string;
}
