import { FieldGroup, Hint, Toggle } from "./fields";
import type { Catalog } from "../../hooks/useCatalog";

export function StationsTab({ catalog }: { catalog: Catalog }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <FieldGroup title="Catalog">
        <Hint>
          Focus AMP plays music made by people. Every station in the list is a Pick: chosen by
          hand, from a broadcaster with named people behind it.
        </Hint>
        <Toggle
          name="Show unverified stations"
          hint="Add stations from the community directory, which nobody has checked"
          on={catalog.showUnverified}
          onChange={catalog.setShowUnverified}
        />
        <Hint>
          The directory fills each genre out to around sixty stations and brings back the genres
          that have no Picks yet. It is filtered for talk, dead streams and anything that says it
          is AI-generated, but most AI music stations don't say so, and this is where they turn
          up. Picks keep their badge, so you can always tell the two apart.
        </Hint>
      </FieldGroup>
    </div>
  );
}
