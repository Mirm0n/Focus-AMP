import { useState } from "react";

import { FieldGroup, Hint, Toggle } from "./fields";
import { useCloseToTray } from "../../lib/prefs";
import { loadCheckForUpdates, setCheckForUpdates } from "../../lib/updates";

/** Window and background behaviour. */
export function GeneralTab() {
  const [closeToTray, setCloseToTray] = useCloseToTray();
  const [updates, setUpdates] = useState(loadCheckForUpdates);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <FieldGroup title="Window">
        <Toggle
          name="Close to tray"
          hint="The close button hides the window and the radio keeps playing. Quit from the tray icon."
          on={closeToTray}
          onChange={setCloseToTray}
        />
      </FieldGroup>

      <FieldGroup title="Updates">
        <Toggle
          name="Check for updates"
          hint="Ask GitHub once per launch whether a newer version exists"
          on={updates}
          onChange={(on) => {
            setUpdates(on);
            setCheckForUpdates(on);
          }}
        />
        <Hint>
          Nothing is installed without you pressing the button, and nothing can be sent to this
          machine from outside — the app asks, it is never told. The request carries no account
          and no identifier. Turning this off means updates have to be downloaded by hand, which
          for a program that plays streams off the internet is worth thinking about.
        </Hint>
      </FieldGroup>

      <FieldGroup title="Media keys">
        <Hint>
          Play/Pause, Next and Previous keys on your keyboard control Focus AMP whenever it is the
          active media app. Next and Previous step through the list the station was picked from.
        </Hint>
      </FieldGroup>
    </div>
  );
}
