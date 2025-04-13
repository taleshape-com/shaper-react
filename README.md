# Shaper React Embedding SDK

Embed [Shaper](https://taleshape.com) components in your React app

---

## Usage

See the [react router example app](https://github.com/taleshape-com/shaper-react-example) for a complete example app.


### Basic Example

```tsx
import { ShaperDashboard } from "shaper-react";

// in your component:
<ShaperDashboard
  baseUrl={"http://localhost:5454"}
  id={"your-dashboard-id"}
  jwt={jwt}
  refreshJwt={() => {
    fetchJwt();
  }}
/>
```


### Props

```tsx
// The ID of the dashboard to embed.
// Get this from the Shaper UI.
id: string;
// The base URL of the Shaper instance.
// Must be reachable from the user's browser.
baseUrl: string;
// JWT token for authentication.
// Dashboard can only load with a valid JWT.
// Dashboard is in loading state if jwt is undefined.
// This allows you to load the token asynchronously.
// Make sure you generate a token that matches the permissions of the logged in user.
jwt?: string;
// This function is called when the JWT token needs to be refreshed.
// It is also called initially if jwt prop is undefined.
// Use this as trigger to load the token and then set the jwt prop accordingly.
refreshJwt: () => void;
// Optional object of variables passed to the dashboard.
// Values must be strings or arrays of strings.
// Can be used in SQL via `getvariable()` function.
// Set this if you want to control the dashboard's variables from your app.
// This is useful if you like to store the dashboard state in the URL or local storage for example.
// Use this in combination with the onVarsChanged callback to update the vars as needed.
vars?: ShaperDashboardVars;
// Optional callback that is called when the dashboard's variables change.
// Also see vars prop.
onVarsChanged?: (newVars: ShaperDashboardVars) => void;
// Optional callback that is called when embed JS script cannot be loaded from the Shaper instance.
// Use this to render an error message or a fallback UI.
// By default an empty div is rendered.
onLoadError?: (error: string) => void;
```


### Getting the JWT token

To authenticate with Shaper, your backend needs to call the Shaper API and get a JWT token.

1. Create an API Key in the Shaper Admin UI and provide it as a secret to your backend. Never send this key to the client.
2. When the `refreshJwt` callback is called, call your backend and get a new JWT token. By default, tokens are valid for 15 minutes. If a user is active for longer than that, Shaper will call `refreshJwt` again to request a new JWT token.
3. Send a `POST` request to the `/api/auth/token` Shaper API endpoint. The request body must contain the following JSON data:
   - `token`: The API key you created in step 1.
   - `dashboardId`: The ID of the dashboard you want to embed.
   - `variables`: (optional) An object containing variables to pass to the dashboard. These variables cannot be overridden by the user. Use this to restrict what the user is able to see. For example, you can set a "user_id" or "organization_id" and use these as filters in your SQL queries.
4. The API response looks like `{ "jwt": "..." }`. Send the JWT token to the client and set as the `jwt` prop of the `ShaperDashboard` component.

#### Example Request

```js
const r = await fetch(`${SHAPER_BASE_URL}/api/auth/token`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    token: API_KEY,
    dashboardId: dashboardId,
    variables: variables,
  }),
});
```
