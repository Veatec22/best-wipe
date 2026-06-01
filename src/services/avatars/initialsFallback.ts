const INK = "#0a0a0a";
const PAPER = "#f4f1ea";

const extractInitials = (label: string): string => {
  const cleaned = label.trim();
  if (!cleaned) return "??";
  const tokens = cleaned.split(/[\s_\-./]+/).filter(Boolean);
  if (tokens.length === 0) return "??";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase();
};

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, c =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&apos;",
  );

export const initialsDataUrl = (label: string, tone: "ink" | "paper" = "paper"): string => {
  const initials = extractInitials(label);
  const bg = tone === "paper" ? PAPER : INK;
  const fg = tone === "paper" ? INK : PAPER;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges"><rect width="64" height="64" fill="${bg}"/><rect x="0" y="0" width="64" height="64" fill="none" stroke="${fg}" stroke-width="2"/><text x="32" y="44" font-family="VT323, monospace" font-size="36" text-anchor="middle" fill="${fg}">${escapeXml(initials)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
