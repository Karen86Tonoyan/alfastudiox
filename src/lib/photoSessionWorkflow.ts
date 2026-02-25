/**
 * Photo Session Workflow Builder
 * Builds a ComfyUI workflow graph for professional photo sessions
 * using Flux.2 Dev + PuLID + IPAdapter + Janus-Pro + SUPIR
 */

export interface PhotoSessionConfig {
  // Uploaded image filenames (as stored in ComfyUI input/)
  locationImage: string | null;
  modelImage: string | null;
  productImage: string | null;

  // Pose
  pose: string;

  // Active layers
  layers: {
    janusPrompt: boolean;
    pulid: boolean;
    ipAdapter: boolean;
    depth: boolean;
    openPose: boolean;
    supir: boolean;
  };

  // Model selections (paths from ComfyUI)
  checkpoint?: string;
  vae?: string;
  lora?: string;
  controlnet?: string;
  upscaler?: string;
  sampler?: string;
  scheduler?: string;

  // Layer weights
  ipWeight: number;
  pulidWeight: number;
  supirStrength: number;

  // Prompt
  promptBase: string;

  // Generation params
  width: number;
  height: number;
  steps: number;
  cfg: number;
  seed: number;
}

interface ComfyNode {
  class_type: string;
  inputs: Record<string, any>;
}

type ComfyWorkflow = Record<string, ComfyNode>;

const POSE_PROMPTS: Record<string, string> = {
  "standing-front": "standing facing camera, straight posture, arms relaxed at sides",
  "standing-side": "standing in three-quarter view, slight turn, elegant posture",
  "sitting": "sitting gracefully on a chair, relaxed pose, looking at camera",
  "walking": "walking naturally, mid-stride, dynamic movement, candid",
  "closeup": "close-up portrait, face and shoulders, slight head tilt",
  "action": "dynamic action pose, movement blur, energetic",
  "editorial": "editorial fashion pose, strong angles, high fashion stance",
  "casual": "casual relaxed pose, natural and authentic, lifestyle",
};

export function buildPhotoSessionWorkflow(config: PhotoSessionConfig): ComfyWorkflow {
  const seed = config.seed === -1 ? Math.floor(Math.random() * 2 ** 53) : config.seed;
  const workflow: ComfyWorkflow = {};
  let nextId = 1;
  const id = () => String(nextId++);

  // ── 1. Load Checkpoint (Flux.2 Dev) ──
  const ckptId = id();
  workflow[ckptId] = {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: config.checkpoint || "flux1-dev.safetensors" },
  };

  let modelOut: [string, number] = [ckptId, 0];
  let clipOut: [string, number] = [ckptId, 1];

  // ── LoRA (optional) ──
  if (config.lora && config.lora !== "__none__") {
    const loraId = id();
    workflow[loraId] = {
      class_type: "LoraLoader",
      inputs: {
        model: modelOut,
        clip: clipOut,
        lora_name: config.lora,
        strength_model: 0.8,
        strength_clip: 0.8,
      },
    };
    modelOut = [loraId, 0];
    clipOut = [loraId, 1];
  }

  // ── 2. Load input images ──
  let locationLoadId: string | null = null;
  let modelLoadId: string | null = null;
  let productLoadId: string | null = null;

  if (config.locationImage) {
    locationLoadId = id();
    workflow[locationLoadId] = {
      class_type: "LoadImage",
      inputs: { image: config.locationImage },
    };
  }

  if (config.modelImage) {
    modelLoadId = id();
    workflow[modelLoadId] = {
      class_type: "LoadImage",
      inputs: { image: config.modelImage },
    };
  }

  if (config.productImage) {
    productLoadId = id();
    workflow[productLoadId] = {
      class_type: "LoadImage",
      inputs: { image: config.productImage },
    };
  }

  // ── 3. Janus-Pro auto-prompt (optional) ──
  let autoPromptText = "";
  let janusDescId: string | null = null;

  if (config.layers.janusPrompt && modelLoadId) {
    const janusLoaderId = id();
    workflow[janusLoaderId] = {
      class_type: "JanusModelLoader",
      inputs: { model_name: "deepseek-ai/Janus-Pro-7B" },
    };

    janusDescId = id();
    workflow[janusDescId] = {
      class_type: "JanusImageUnderstanding",
      inputs: {
        model: [janusLoaderId, 0],
        image: [modelLoadId, 0],
        prompt: "Describe this person in extreme detail: face features, skin tone, hair color and style, body type, clothing, accessories. Output as a Stable Diffusion prompt.",
      },
    };
  }

  // ── 4. Build prompt ──
  const poseDesc = POSE_PROMPTS[config.pose] || POSE_PROMPTS["standing-front"];
  const basePrompt = config.promptBase
    ? `${config.promptBase}, ${poseDesc}`
    : `professional photo session, ${poseDesc}, masterpiece, best quality, 8k, RAW photo, ultra high resolution, sharp focus, cinematic lighting`;

  const promptId = id();
  workflow[promptId] = {
    class_type: "CLIPTextEncode",
    inputs: {
      text: basePrompt,
      clip: clipOut,
    },
  };

  const negId = id();
  workflow[negId] = {
    class_type: "CLIPTextEncode",
    inputs: {
      text: "blurry, low quality, deformed, watermark, text, ugly, duplicate, morbid, cartoon, painting, 3d render, bad anatomy",
      clip: clipOut,
    },
  };

  // ── 5. PuLID – face identity (optional) ──
  if (config.layers.pulid && modelLoadId) {
    const pulidLoaderId = id();
    workflow[pulidLoaderId] = {
      class_type: "PuLID_FluxLoader",
      inputs: {},
    };

    const pulidEmbedId = id();
    workflow[pulidEmbedId] = {
      class_type: "PuLID_FluxFaceEmbed",
      inputs: {
        pulid_model: [pulidLoaderId, 0],
        image: [modelLoadId, 0],
      },
    };

    const pulidApplyId = id();
    workflow[pulidApplyId] = {
      class_type: "PuLID_FluxApply",
      inputs: {
        model: modelOut,
        face_embed: [pulidEmbedId, 0],
        weight: config.pulidWeight ?? 0.85,
      },
    };
    modelOut = [pulidApplyId, 0];
  }

  // ── 6. IPAdapter – style/product reference (optional) ──
  if (config.layers.ipAdapter) {
    if (productLoadId) {
      const ipaApplyId = id();
      workflow[ipaApplyId] = {
        class_type: "IPAdapterFlux_Apply",
        inputs: {
          model: modelOut,
          image: [productLoadId, 0],
          weight: config.ipWeight ?? 0.75,
          noise: 0.1,
        },
      };
      modelOut = [ipaApplyId, 0];
    }
    if (locationLoadId) {
      const ipaStyleId = id();
      workflow[ipaStyleId] = {
        class_type: "IPAdapterFlux_StyleRef",
        inputs: {
          model: modelOut,
          image: [locationLoadId, 0],
          weight: (config.ipWeight ?? 0.75) * 0.8,
        },
      };
      modelOut = [ipaStyleId, 0];
    }
  }

  // ── 7. ControlNet Depth (optional) ──
  if (config.layers.depth && locationLoadId) {
    const depthEstId = id();
    workflow[depthEstId] = {
      class_type: "DepthAnythingV2Preprocessor",
      inputs: { image: [locationLoadId, 0] },
    };

    const cnLoadId = id();
    workflow[cnLoadId] = {
      class_type: "ControlNetLoader",
      inputs: { control_net_name: config.controlnet || "control_v11f1p_sd15_depth.safetensors" },
    };

    const cnApplyId = id();
    workflow[cnApplyId] = {
      class_type: "ControlNetApply",
      inputs: {
        conditioning: [promptId, 0],
        control_net: [cnLoadId, 0],
        image: [depthEstId, 0],
        strength: 0.65,
      },
    };
    // Route conditioned positive through
    workflow[promptId].inputs = { ...workflow[promptId].inputs };
  }

  // ── 8. OpenPose (optional) ──
  if (config.layers.openPose && modelLoadId) {
    const poseEstId = id();
    workflow[poseEstId] = {
      class_type: "OpenposePreprocessor",
      inputs: { image: [modelLoadId, 0] },
    };
  }

  // ── 9. Empty latent + KSampler ──
  const latentId = id();
  workflow[latentId] = {
    class_type: "EmptyLatentImage",
    inputs: { width: config.width, height: config.height, batch_size: 1 },
  };

  const samplerId = id();
  workflow[samplerId] = {
    class_type: "KSampler",
    inputs: {
      model: modelOut,
      positive: [promptId, 0],
      negative: [negId, 0],
      latent_image: [latentId, 0],
      seed,
      steps: config.steps,
      cfg: config.cfg,
      sampler_name: config.sampler || "dpmpp_2m",
      scheduler: config.scheduler || "normal",
      denoise: 1.0,
    },
  };

  // ── 10. VAE Decode ──
  let vaeSource: [string, number] = [ckptId, 2];
  if (config.vae) {
    const vaeLoadId = id();
    workflow[vaeLoadId] = {
      class_type: "VAELoader",
      inputs: { vae_name: config.vae },
    };
    vaeSource = [vaeLoadId, 0];
  }
  const vaeDecId = id();
  workflow[vaeDecId] = {
    class_type: "VAEDecode",
    inputs: { samples: [samplerId, 0], vae: vaeSource },
  };

  let finalImageOut: [string, number] = [vaeDecId, 0];

  // ── 11. SUPIR Upscale (optional) ──
  if (config.layers.supir) {
    const supirId = id();
    workflow[supirId] = {
      class_type: "SUPIR_Upscale",
      inputs: {
        image: finalImageOut,
        scale: 2,
        strength: config.supirStrength ?? 0.4,
        face_restore: true,
      },
    };
    finalImageOut = [supirId, 0];
  }

  // ── 12. Save ──
  const saveId = id();
  workflow[saveId] = {
    class_type: "SaveImage",
    inputs: {
      images: finalImageOut,
      filename_prefix: `photosession_${config.pose}_${seed}`,
    },
  };

  return workflow;
}

export const DEFAULT_SESSION_CONFIG: PhotoSessionConfig = {
  locationImage: null,
  modelImage: null,
  productImage: null,
  pose: "standing-front",
  layers: {
    janusPrompt: true,
    pulid: true,
    ipAdapter: true,
    depth: true,
    openPose: false,
    supir: true,
  },
  sampler: "dpmpp_2m",
  scheduler: "normal",
  ipWeight: 0.7,
  pulidWeight: 0.85,
  supirStrength: 0.4,
  promptBase: "professional photo session, masterpiece, best quality, 8k, RAW photo, ultra high resolution, sharp focus, cinematic lighting",
  width: 1024,
  height: 1536,
  steps: 25,
  cfg: 3.5,
  seed: -1,
};
