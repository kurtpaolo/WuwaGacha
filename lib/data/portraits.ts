// Registry of available portraits for User Avatar customization
// ONLY includes portraits that physically exist in public/assets/inventory_portraits

export interface InventoryPortrait {
  id: string;
  name: string;
  fileName: string;
}

export const INVENTORY_PORTRAITS: InventoryPortrait[] = [
  { id: "shorekeeper", name: "Shorekeeper", fileName: "shorekeeper.jpeg" },
  { id: "camellya", name: "Camellya", fileName: "camellya.jpeg" },
  { id: "changli", name: "Changli", fileName: "changli.jpeg" },
  { id: "jinhsi", name: "Jinhsi", fileName: "jinhsi.jpeg" },
  { id: "yinlin", name: "Yinlin", fileName: "yinlin.jpeg" },
  { id: "jiyan", name: "Jiyan", fileName: "jiyan.jpeg" },
  { id: "phrolova", name: "Phrolova", fileName: "phrolova.jpeg" },
  { id: "carlotta", name: "Carlotta", fileName: "carlotta.jpeg" },
  { id: "roccia", name: "Roccia", fileName: "roccia.jpeg" },
  { id: "phoebe", name: "Phoebe", fileName: "phoebe.jpeg" },
  { id: "zhezhi", name: "Zhezhi", fileName: "zhezhi.jpeg" },
  { id: "xiangli_yao", name: "Xiangli Yao", fileName: "xiangli_yao.jpeg" },
  { id: "cantarella", name: "Cantarella", fileName: "cantarella.jpeg" },
  { id: "brant", name: "Brant", fileName: "brant.jpeg" },
  { id: "qiuyuan", name: "Qiuyuan", fileName: "qiuyuan.jpeg" },
  { id: "suoming", name: "Suoming", fileName: "suoming.jpeg" },
  { id: "yangyang", name: "Yangyang", fileName: "yangyang.jpeg" },
  { id: "yangyang_xuanling", name: "Yangyang (Xuanling)", fileName: "yangyang_xuanling.jpeg" },
  { id: "aemeath", name: "Aemeath", fileName: "aemeath.jpeg" },
  { id: "augusta", name: "Augusta", fileName: "augusta.jpeg" },
  { id: "cartethyia", name: "Cartethyia", fileName: "cartethyia.jpeg" },
  { id: "chisa", name: "Chisa", fileName: "chisa.jpeg" },
  { id: "ciaccona", name: "Ciaccona", fileName: "ciaccona.jpeg" },
  { id: "denia", name: "Denia", fileName: "denia.jpeg" },
  { id: "galbrena", name: "Galbrena", fileName: "galbrena.jpeg" },
  { id: "hiyuki", name: "Hiyuki", fileName: "hiyuki.jpeg" },
  { id: "hsin", name: "Hsin", fileName: "hsin.jpeg" },
  { id: "iuno", name: "Iuno", fileName: "iuno.jpeg" },
  { id: "jingran", name: "Jingran", fileName: "jingran.jpeg" },
  { id: "lucilla", name: "Lucilla", fileName: "lucilla.jpeg" },
  { id: "lucy", name: "Lucy", fileName: "lucy.jpeg" },
  { id: "lupa", name: "Lupa", fileName: "lupa.jpeg" },
  { id: "luuk_herssen", name: "Luuk Herssen", fileName: "luuk_herssen.jpeg" },
  { id: "lynae", name: "Lynae", fileName: "lynae.jpeg" },
  { id: "mornye", name: "Mornye", fileName: "mornye.jpeg" },
  { id: "qingxiao", name: "Qingxiao", fileName: "qingxiao.jpeg" },
  { id: "rebecca", name: "Rebecca", fileName: "rebecca.jpeg" },
  { id: "sigrika", name: "Sigrika", fileName: "sigrika.jpeg" },
  { id: "suisui", name: "Suisui", fileName: "suisui.jpeg" },
  { id: "zani", name: "Zani", fileName: "zani.jpeg" },
];

export const DEFAULT_AVATAR_ID = "shorekeeper";

export function getPortraitFileName(avatarId?: string): string {
  if (!avatarId) return `${DEFAULT_AVATAR_ID}.jpeg`;
  const found = INVENTORY_PORTRAITS.find(
    (p) => p.id.toLowerCase() === avatarId.toLowerCase()
  );
  return found ? found.fileName : `${DEFAULT_AVATAR_ID}.jpeg`;
}

export function getResonatorTitle(avatarId?: string): string {
  if (!avatarId) return "Guardian of the Black Shores";
  const id = avatarId.toLowerCase();
  const titles: Record<string, string> = {
    shorekeeper: "Guardian of the Black Shores",
    camellya: "Bloom of the Black Shores",
    changli: "Counselor to the Jinzhou Magistrate",
    jinhsi: "Magistrate of Jinzhou",
    yinlin: "Secret Investigator",
    jiyan: "General of the Midnight Rangers",
    phrolova: "Overseer of the Fractsidus",
    carlotta: "Frostveil Virtuoso",
    roccia: "Shadow of Twilight",
    phoebe: "Radiant Dawn Oracle",
    zhezhi: "Commission Painter of Jinzhou",
    xiangli_yao: "Principal Investigator of Huaxu Academy",
    cantarella: "Abyssal Enchantress",
    brant: "Solar Vanguard",
    qiuyuan: "Wandering Blade of the Wind",
    suoming: "Crimson Howler",
    yangyang: "Outrider of Midnight Rangers",
    yangyang_xuanling: "Xuanling Feather",
    aemeath: "Herald of the Dawn",
    augusta: "Vanguard of Solaris",
    cartethyia: "Mistress of the Tide",
    chisa: "Gale of the West",
    ciaccona: "Melody of the Northern Star",
    denia: "Blade of the Horizon",
    galbrena: "Flame of Solaris",
    hiyuki: "Frostbound Songstress",
    hsin: "Sentinel of the Peak",
    iuno: "Moonlit Sentinel",
    jingran: "Radiant Blade",
    lucilla: "Starlight Weaver",
    lucy: "Shadowdancer",
    lupa: "Wildfang Huntress",
    luuk_herssen: "Scholar of the Deep",
    lynae: "Windwalker",
    mornye: "Dusk Whisperer",
    qingxiao: "Thunderclap Sovereign",
    rebecca: "Echo of Eternity",
    sigrika: "Frostcarver",
    suisui: "Aria of the River",
    zani: "Oracle of the Golden Sand",
    verina: "Botanist of the Academy",
    calcharo: "Leader of the Ghost Hounds",
    encore: "Consultant of the Black Shores",
    jianxin: "Taoist of Fengyidu",
    lingyang: "Liondancer of Jinzhou",
  };
  return titles[id] || "Guardian of the Black Shores";
}
