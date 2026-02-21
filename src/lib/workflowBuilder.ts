/**
 * Converts RenderSettings to ComfyUI API workflow JSON format.
 * Builds a node graph compatible with ComfyUI's /prompt endpoint.
 */

import type { RenderSettings } from "@/components/render/RenderControlPanel";

// Map our model IDs to checkpoint filenames
const MODEL_CHECKPOINTS: Record<string, string> = {
  "sdxl": "sd_xl_base_1.0.safetensors",
  "flux-dev": "flux1-dev.safetensors",
  "flux-schnell": "flux1-schnell.safetensors",
  "sd3": "sd3_medium.safetensors",
  "playground-v2.5": "playground-v2.5-1024.safetensors",
  "animatediff": "sd_xl_base_1.0.safetensors",
  "wan-video": "wan_video_2.1.safetensors",
  "svd": "svd_xt.safetensors",
  "img2vid": "svd_xt_1_1.safetensors",
  "liveportrait": "sd_xl_base_1.0.safetensors",
};

const LORA_FILES: Record<string, string> = {
  "detail-tweaker": "detail_tweaker_xl.safetensors",
  "film-grain": "film_grain_v1.safetensors",
  "cinematic": "cinematic_look_v1.safetensors",
  "anime": "anime_style_v1.safetensors",
  "photorealistic": "photorealistic_v1.safetensors",
};

interface ComfyNode {
  class_type: string;
  inputs: Record<string, any>;
}

type ComfyWorkflow = Record<string, ComfyNode>;

export function buildImageWorkflow(settings: RenderSettings): ComfyWorkflow {
  const seed = settings.seed === -1 ? Math.floor(Math.random() * 2 ** 53) : settings.seed;
  const checkpoint = MODEL_CHECKPOINTS[settings.model] || "sd_xl_base_1.0.safetensors";

  const workflow: ComfyWorkflow = {};

  // Node 1: Load Checkpoint
  workflow["1"] = {
    class_type: "CheckpointLoaderSimple",
    inputs: {
      ckpt_name: checkpoint,
    },
  };

  let modelOutput: [string, number] = ["1", 0]; // [node_id, output_index]
  let clipOutput: [string, number] = ["1", 1];

  // Optional LoRA
  if (settings.lora !== "none" && settings.lora !== "custom" && LORA_FILES[settings.lora]) {
    workflow["2"] = {
      class_type: "LoraLoader",
      inputs: {
        lora_name: LORA_FILES[settings.lora],
        strength_model: settings.loraWeight,
        strength_clip: settings.loraWeight,
        model: ["1", 0],
        clip: ["1", 1],
      },
    };
    modelOutput = ["2", 0];
    clipOutput = ["2", 1];
  }

  // Node 3: CLIP Text Encode (Positive)
  workflow["3"] = {
    class_type: "CLIPTextEncode",
    inputs: {
      text: settings.prompt,
      clip: clipOutput,
    },
  };

  // Node 4: CLIP Text Encode (Negative)
  workflow["4"] = {
    class_type: "CLIPTextEncode",
    inputs: {
      text: settings.negativePrompt,
      clip: clipOutput,
    },
  };

  // Node 5: Empty Latent Image
  workflow["5"] = {
    class_type: "EmptyLatentImage",
    inputs: {
      width: settings.width,
      height: settings.height,
      batch_size: 1,
    },
  };

  // Node 6: KSampler
  workflow["6"] = {
    class_type: "KSampler",
    inputs: {
      model: modelOutput,
      positive: ["3", 0],
      negative: ["4", 0],
      latent_image: ["5", 0],
      seed: seed,
      steps: settings.steps,
      cfg: settings.cfg,
      sampler_name: settings.sampler,
      scheduler: "normal",
      denoise: 1.0,
    },
  };

  // Node 7: VAE Decode
  workflow["7"] = {
    class_type: "VAEDecode",
    inputs: {
      samples: ["6", 0],
      vae: ["1", 2],
    },
  };

  // Node 8: Save Image
  workflow["8"] = {
    class_type: "SaveImage",
    inputs: {
      images: ["7", 0],
      filename_prefix: `render_${settings.model}_${seed}`,
    },
  };

  return workflow;
}

export function buildVideoWorkflow(settings: RenderSettings): ComfyWorkflow {
  const seed = settings.seed === -1 ? Math.floor(Math.random() * 2 ** 53) : settings.seed;

  if (settings.model === "animatediff") {
    return buildAnimateDiffWorkflow(settings, seed);
  }

  // Default: SVD-style video workflow
  const workflow: ComfyWorkflow = {};

  workflow["1"] = {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: MODEL_CHECKPOINTS[settings.model] || "svd_xt.safetensors" },
  };

  workflow["2"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: settings.prompt, clip: ["1", 1] },
  };

  workflow["3"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: settings.negativePrompt, clip: ["1", 1] },
  };

  workflow["4"] = {
    class_type: "EmptyLatentImage",
    inputs: { width: settings.width, height: settings.height, batch_size: settings.frames },
  };

  workflow["5"] = {
    class_type: "KSampler",
    inputs: {
      model: ["1", 0],
      positive: ["2", 0],
      negative: ["3", 0],
      latent_image: ["4", 0],
      seed,
      steps: settings.steps,
      cfg: settings.cfg,
      sampler_name: settings.sampler,
      scheduler: "normal",
      denoise: 1.0,
    },
  };

  workflow["6"] = {
    class_type: "VAEDecode",
    inputs: { samples: ["5", 0], vae: ["1", 2] },
  };

  workflow["7"] = {
    class_type: "SaveAnimatedWEBP",
    inputs: {
      images: ["6", 0],
      filename_prefix: `video_${settings.model}_${seed}`,
      fps: settings.fps,
      quality: 90,
    },
  };

  return workflow;
}

function buildAnimateDiffWorkflow(settings: RenderSettings, seed: number): ComfyWorkflow {
  const workflow: ComfyWorkflow = {};

  workflow["1"] = {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" },
  };

  workflow["2"] = {
    class_type: "ADE_AnimateDiffLoaderWithContext",
    inputs: {
      model: ["1", 0],
      model_name: "v3_sd15_mm.ckpt",
      context_length: 16,
      context_overlap: 4,
    },
  };

  workflow["3"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: settings.prompt, clip: ["1", 1] },
  };

  workflow["4"] = {
    class_type: "CLIPTextEncode",
    inputs: { text: settings.negativePrompt, clip: ["1", 1] },
  };

  workflow["5"] = {
    class_type: "EmptyLatentImage",
    inputs: { width: settings.width, height: settings.height, batch_size: settings.frames },
  };

  workflow["6"] = {
    class_type: "KSampler",
    inputs: {
      model: ["2", 0],
      positive: ["3", 0],
      negative: ["4", 0],
      latent_image: ["5", 0],
      seed,
      steps: settings.steps,
      cfg: settings.cfg,
      sampler_name: settings.sampler,
      scheduler: "normal",
      denoise: 1.0,
    },
  };

  workflow["7"] = {
    class_type: "VAEDecode",
    inputs: { samples: ["6", 0], vae: ["1", 2] },
  };

  workflow["8"] = {
    class_type: "SaveAnimatedWEBP",
    inputs: {
      images: ["7", 0],
      filename_prefix: `animatediff_${seed}`,
      fps: settings.fps,
      quality: 90,
    },
  };

  return workflow;
}

export function buildWorkflow(settings: RenderSettings): ComfyWorkflow {
  return settings.modelType === "video"
    ? buildVideoWorkflow(settings)
    : buildImageWorkflow(settings);
}

/**
 * Exports settings + workflow as a single JSON for save/load
 */
export function exportWorkflowBundle(settings: RenderSettings) {
  return {
    version: 1,
    timestamp: Date.now(),
    settings,
    workflow: buildWorkflow(settings),
  };
}
