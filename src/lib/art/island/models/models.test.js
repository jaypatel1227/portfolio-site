import { it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cabin } from "./cabin.ts";
import { character } from "./character.ts";
import { grass, mushroom } from "./flora.ts";
import { greatTree } from "./oak.ts";
import { island } from "./ground.ts";
import { lantern, sign } from "./props.ts";
import { pine } from "./pine.ts";
import { rock } from "./rock.ts";
import { fish, fox, owl, rabbit } from "./animals.ts";

void it("preserves the established seed's voxel artwork", () => {
  const snapshots = [
    [cabin, "33e82b9043abb159d1b0d7c18e3dc0d0f36eaa39f5225c8119c7da7a08ea2b33"],
    [character, "df304be79024aa3981a2b6ad0d17ca6f269ada3b617b521274c7e526ae9c9f89"],
    [grass, "1be999c267650ae7a96b0b1aac3bbf15a23e0cf1920f90523ee7687309e945cc"],
    [greatTree, "d53f25920309c616e4a2c70d7874860db7a3e32af8fa445262024fa9f1c9318c"],
    [island, "9b9189c6cd073792783c9049e955e8117811432fdd1bd63bb6790e9de9575ae8"],
    [lantern, "1068f8aba1a1159eb26b3bed70faa9aec34cee476aaf875043a2b03a1c5c9b00"],
    [mushroom, "e1bc1106a588105d0a0d5fcc7d3811d83eda6b6f470f087dd9f4b2cebd9c59ed"],
    [pine, "f628dac0fed93d52ec7accd7820bb636f77c9522484175a4ea0a7d06aebda87e"],
    [rock, "6b79b6dc5f9be3861b45e322d52d20ce35e276de0a2da4269ae1660381bd1737"],
    [sign, "a17461cac1c287cab866d1fea9460e0a29995e8057303c21518de91dea184d05"],
    [fish, "17535f96b622ab2e0130ba4f1198af50911692965da88b4e8ae54f96593026cc"],
    [fox, "112f407597f019f8aa9459bf801c6a01e54cdd1b03bc5f42e8bfaa38e07fba3c"],
    [() => owl(true), "4381e44e5bd7ab90f8355b94508361dffe0c41cdb68b7c0b89a6d8969cfd39d8"],
    [rabbit, "3d74dd0cf975ef00c1052a4725126fbb36122a49895f52e34326132a86645bf9"],
  ];
  for (const [generate, hash] of snapshots) assert.equal(createHash("sha256").update(generate(2026).cells).digest("hex"), hash);
});
