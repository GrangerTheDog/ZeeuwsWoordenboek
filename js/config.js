// Pas dit aan als de repository verhuist of een andere naam krijgt.
export const CONFIG = {
  githubEigenaar: 'GrangerTheDog',
  githubRepo: 'ZeeuwsWoordenboek',
  sjabloonNieuwWoord: 'nieuw-woord.yml',
  sjabloonCorrectie: 'correctie.yml',
};

export const repoUrl = () => `https://github.com/${CONFIG.githubEigenaar}/${CONFIG.githubRepo}`;

export function issueUrl(sjabloon, velden = {}, titel = '') {
  const p = new URLSearchParams({ template: sjabloon });
  if (titel) p.set('title', titel);
  for (const [k, v] of Object.entries(velden)) if (v) p.set(k, v);
  return `${repoUrl()}/issues/new?${p}`;
}
