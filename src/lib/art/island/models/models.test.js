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
    [cabin, "ae87e50afc7edbb8fb62c9fd08fcb07dd6fa3b3bc1f50742d125772bdecb0914"],
    [character, "840fc6f9734bc03f3d73c307f83201ea2a8c9251b22ff0ffdf92059ad60cd79d"],
    [grass, "e75810fef6ef27119cacf54de59ce8c29808e24c5571b4580315b03f5f7478de"],
    [greatTree, "e048ba1414824b21a8fbc006538775e6f26d748af6330a4cd6309b38449440cb"],
    [island, "17bbdec65356cd7ca379d4a2cc0b3445487fc38bdc021bc0fd07315430087a66"],
    [lantern, "d97b995a39b79f719b25167aea26bf4556892c7d985d4ab636b84d77517b3490"],
    [mushroom, "c8091ea86555f5f3c719593f41c3334e5304bb863d1b20eacc2af7c13dbef107"],
    [pine, "4d7520c1fac6dabe2a42933423a3e31ecceeeec9d65aa69ac9cf1e9723185a16"],
    [rock, "c33465e5e1ed6daf82429ca2beb744d45649b9749447b370fed8dc0738d77a4d"],
    [sign, "15caac6800fd877a97f07933d9154163c1fd7e656bf4f7513aeef28328b97056"],
    [fish, "51cafc83aa8df1fec3517788feb90274bd2169400edf4368afba6099022c3ee6"],
    [fox, "35b0e3743a988a9c6b5bc9ebf2632b83f52a3f9f997df3518f9129ae75e61de2"],
    [() => owl(true), "ad4ce6d3c2dc65ed6dab41da46d27debc697b828d17c77a5554871408f7657c5"],
    [rabbit, "591db5d9016f3e5641ec996058d062901d7b1f5f4aeb9ea7ea85863d5cf99e5a"],
  ];
  for (const [generate, hash] of snapshots) assert.equal(createHash("sha256").update(generate(2026).cells).digest("hex"), hash);
});
