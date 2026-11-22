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
    [cabin, "348a77eb703a9266f9fac0e1bd41d87661c19e6b3f4397cee15338c6dd9b30a5"],
    [character, "06ddf8cc0e89fdba0145aac3ad170426ec266a38dfa89f0d960d12e66e077f7f"],
    [grass, "97fa7f05030ee4b926afba03d13ffccce9660bb10cb1e8bfdead25399433cf19"],
    [greatTree, "09887d59a2b10932b30538498a768a574e3d706f766f443cd2ecc9e6a079d50d"],
    [island, "bc1ffd514039490e45c0f4060f5a2f15a1f2e282efe3f85d221d699ad231c28a"],
    [lantern, "2758dbd7a90ac10c45e97a63475b84a1dfed7f1a9e9715b3db035d35a4aaf6fa"],
    [mushroom, "787a0c57ae3872d947463d97e6e90a0ac91885d9e384f31dcbf6d2b9b8b4dd61"],
    [pine, "350aa70035f9792a017e50e91e4677057b0b9a587c0f709e472e0175aaa7f3d4"],
    [rock, "dd4882594d32069a70cdc19abc8b6fee021fcee0f720d7cc58686f288b645eb3"],
    [sign, "ef4c40118a540ccfdc56193fe18d1255757afd5a07315f40c737a46aaa9aa065"],
    [fish, "103431b1afc337b19e9f5c8c923c75287750e57547cb234db25004fded221add"],
    [fox, "26b9fe394b3e60fcb6358dd38845b855c45b5f4d965d4c9212aad10ad0c066e5"],
    [() => owl(true), "1883190c1f522c32d88d073a1c4449609126e42ebc0c0693acbe07fb798a3d20"],
    [rabbit, "ad631d0977b9e438a387697104f107419d2c4c40347bd56f6b7d557eb9e01e81"],
  ];
  for (const [generate, hash] of snapshots) assert.equal(createHash("sha256").update(generate(2026).cells).digest("hex"), hash);
});
