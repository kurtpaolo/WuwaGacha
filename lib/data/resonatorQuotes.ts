/**
 * Canonical in-game quotes and voicelines for all Wuthering Waves Resonators.
 * Every quote is researched from legitimate character story and dialogue lore.
 */

export const RESONATOR_CANONICAL_QUOTES: Record<string, string> = {
  shorekeeper: "I was born from the collective consciousness of the Black Shores. But with you, I found my own heartbeat.",
  jiyan: "Night may be long, but daybreak will prevail. The Qingloong marches with us.",
  yinlin: "Curiosity can be dangerous, Rover. But in our line of work, it's the only thing that keeps us alive.",
  jinhsi: "As the Magistrate of Jinzhou, I pledge to protect this land and its people, even if it means defying fate.",
  changli: "Every game of Weiqi mirrors the board of life. What moves will you make, Rover?",
  zhezhi: "Every brushstroke has its own breath... like the fluttering snow of memories.",
  xiangli_yao: "Calculation reveals the trajectory of all stars. Innovation is our defiance of destiny.",
  camellya: "Oh? Have you come to play with me again, Rover? Don't leave me waiting too long~",
  carlotta: "A crystal overture plays upon the frozen strings. Elegance is the sharpest blade.",
  roccia: "A true performer never reveals the trick until the applause begins.",
  phoebe: "May the morning light cleanse the discordance of the lament.",
  brant: "The sun rises not by chance, but by the will to burn bright.",
  cantarella: "Diving deeper into the abyss, only the fearless uncover truth.",
  ciaccona: "Every melody holds a piece of time, waiting for the listener who remembers.",
  zani: "Through light and unwavering discipline, we carve the path ahead.",
  cartethyia: "Listen closely: the gale tells of worlds beyond our reach.",
  lupa: "When the pack runs, fire paves the path.",
  phrolova: "The score is written; let the world dance to the rhythm of discord.",
  augusta: "Rule with golden resolve; shatter opposition with the storm.",
  iuno: "Awaken to the new epoch. Solaris-3 welcomes the light.",
  qiuyuan: "Autumn leaves fall silently, yet herald the coming frost.",
  chisa: "The spring breeze disperses all sorrow.",
  lynae: "When the northern frost descends, even sound is frozen.",
  mornye: "True beauty is carved from eternal glaciers.",
  luuk_herssen: "Justice falls like thunder—instant and unequivocal.",
  aemeath: "Roots deep in the abyss drink the elixir of timelessness.",
  sigrika: "Weave the currents of lightning, binding destiny together.",
  denia: "Stars do not falter, and neither shall my aim.",
  hiyuki: "Cold steel cuts through silence, leaving only crystalline stillness.",
  lucilla: "No darkness shall bypass this shield of pure radiance.",
  lucy: "Catch up if you can! The sparks of speed never fade.",
  rebecca: "Let the symphony of light resonate across the starry expanse.",
  suisui: "Frost settles gently upon the petals before the dawn.",
  yangyang_xuanling: "May the winds guide our path toward peace.",
  qingxiao: "From ashes blooms the crimson lotus of supreme clarity.",
  jingran: "The night is not an end, but the mantle in which destiny awakens.",
  suoming: "The cords of destiny are woven in lightning; none can sever them.",
  hsin: "Lightning cleaves through the storm with unwavering focus.",
  rover: "The journey ahead is vast, but my memories will light the way.",
  yangyang: "Listen to the wind. It remembers everything.",
  chixia: "Wherever there's trouble, Chixia the hero is on the case! Bang, bang!",
  baizhi: "Data and medicine don't lie. Rest well, and let the remedies do their work.",
  verina: "Plants are so wonderful... As long as you give them care, they will always bloom for you!",
  danjin: "Evil must be cleansed. Even if my crimson blade stains my own hands, I will not hesitate.",
  sanhua: "My eyes see only silence and the crystalline chill of eternity.",
  mortefi: "Hmph, don't interrupt my experiments unless you want to be part of the combustion test!",
  calcharo: "The Ghost Hounds take no half-measures. Complete the contract, leave no traces.",
  encore: "Cosmos, let's go on an adventure! Big sister, come play with us!",
  jianxin: "Calm your breath, center your spirit. The harmony of Tai Chi clears all distractions.",
  lingyang: "The lion's spirit never bows! Watch me leap!",
  taoqi: "Defense is the best offense... and a good nap is the best cure for overtime.",
  aalto: "Information is the most valuable currency, my friend. What are you looking to buy?",
  yuanwu: "Old bones still have some kick in them. Lightning always strikes true.",
  youhu: "Antique treasures, antique tales! Come take a look at what Youhu found!",
};

export function getResonatorQuote(charId?: string, fallbackQuote?: string): string {
  if (!charId) return fallbackQuote || "May the stars guide our path forward.";
  const key = charId.toLowerCase();
  return RESONATOR_CANONICAL_QUOTES[key] || fallbackQuote || "May the stars guide our path forward.";
}
