import { FieldGroup, Hint, Toggle } from "./fields";
import { useCloseToTray } from "../../lib/prefs";

/** Window and background behaviour. */
export function GeneralTab() {
  const [closeToTray, setCloseToTray] = useCloseToTray();

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

      <FieldGroup title="Media keys">
        <Hint>
          Play/Pause, Next and Previous keys on your keyboard control Focus AMP whenever it is the
          active media app. Next and Previous step through the list the station was picked from.
        </Hint>
      </FieldGroup>
    </div>
  );
}
