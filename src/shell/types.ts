export type ManifestFile = {
  path: string;
  sha256: string | null;
};

export type Manifest = {
  name: string;
  ext: string;
  title: string;
  req: string[];
  icon: string;
  entry: string;
  faces: { closed: string; open: string };
  files: ManifestFile[];
  magnet_roots: string[];
  toolbar: { label: string } | null;
  refuses?: string[];
};

export type InventoryRow = {
  path: string;
  where: "inside" | "parent" | "magnet" | "missing";
  hash: string | null;
  magnetized: boolean;
  note?: string;
};

export type Report = {
  packageName: string;
  status: "complete" | "plan";
  rows: InventoryRow[];
  missing: string[];
  magnetized: string[];
  reason?: string;
};

export type Part =
  | { t: "text"; s: string }
  | { t: "cmd"; name: string }
  | { t: "code"; s: string };

export type Msg = {
  id: string;
  role: "host" | "operator";
  parts: Part[];
};

export type Thread = {
  id: string;
  title: string;
  messages: Msg[];
};

export type CustomCommand = {
  name: string;
  blurb: string;
  template: string;
};

export type Settings = {
  title: string;
  operator: string;
  placeholder: string;
  greeting: string;
  hello: string;
  custom: CustomCommand[];
};

export type Phase = "closed" | "hosting" | "open" | "plan";
export type Face = "closed" | "open";

export type Fs = Record<string, string>;
