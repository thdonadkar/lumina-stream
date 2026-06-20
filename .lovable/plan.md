Plan to fix the location picker completely:

1. Make the location picker a true blocking modal
   - Render the picker as a full-screen fixed portal at `z-[9999]`.
   - Add a dedicated dark overlay layer using `rgba(0,0,0,0.8)` with `backdrop-blur`.
   - Make the modal content fill the available screen safely so background text like checkout headings cannot visually collide with it.
   - Lock page scroll while open with `document.body.style.overflow = "hidden"`, then restore it on close.
   - Keep the GPS button above the map and above mobile bottom navigation.

2. Fix the GPS button flow
   - Wire the button click directly to a synchronous handler that logs `GPS CLICKED` before doing anything else.
   - Call `navigator.geolocation.getCurrentPosition()` directly from that click handler.
   - Do not block the call prematurely unless geolocation is unsupported.
   - Log the real permission state, secure context, map readiness, and map center after zoom.
   - On success, call `mapRef.current.setView([lat, lng], 16, { animate: true, duration: 1.5 })`.
   - Move the existing Leaflet marker with `markerRef.current.setLatLng([lat, lng])`.
   - Reverse-geocode the selected point after the marker moves.
   - If the map instance is missing, show a clear error and log `MAP NOT READY`.

3. Improve denied/error handling without breaking the prompt
   - If the browser returns permission denied, show `Enable location from browser settings`.
   - If GPS times out or fails, keep manual map pin and search available.
   - Avoid showing blocked/denied messaging unless the actual permission state or geolocation error says denied.

4. Validate with the browser preview after implementation
   - Open checkout and launch the location picker.
   - Confirm the modal fully blocks the background UI and bottom nav.
   - Click `Use my current location` and verify console logs include `GPS CLICKED`.
   - Mock/allow geolocation in Playwright and confirm logs include `LOCATION:`.
   - Confirm the map center changes to the mocked/user location and marker coordinates match.
   - Report the actual root cause, the logs observed, and confirmation that zoom + marker movement work.