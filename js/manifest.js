// What the page shows. `src` = media base path (loads <src>.json + <src>.mp4|.jpg).
// Rendering is client-side from raw predictions; see scripts/showcase_lib.py for the formats.

const CS = 'Cityscapes demo video (Daimler AG, MPI Informatics, TU Darmstadt), non-commercial terms';
const MIXKIT = (url) => `Mixkit, free license: ${url}`;

const GOOSE = 'Off-road model trained on GOOSE, the German Outdoor and Offroad Dataset (Fraunhofer IOSB, UniBw Munich), CC BY-SA 4.0: https://goose-dataset.de';
const GOOSE_PALETTE = { terrain: '#c4a26e' }; // GOOSE terrain = drivable ground
export const HERO = {
  src: 'media/web/web_sem_goose_dusk_road',
  poster: true,
  opts: { flip: true, palette: GOOSE_PALETTE }, // model view left of the handle
  caption: 'Country road at dusk. Off-road model trained on GOOSE, 69.8 mIoU, full 2048×1024 frames. Largest model, 15 ms per frame. Drag the handle, hover a pixel.',
  credit: `Hero footage: ${MIXKIT('mixkit.co/free-stock-video/traveling-on-a-nature-road-at-dusk-41575')}. ${GOOSE}`,
};

const TRIPTYCH_MP4 = 'media/local/stuttgart_triptych.mp4';
// Tab = plain word (what you see) + the standard term underneath.
export const TASKS = [
  {
    label: 'Pixels', term: 'semantic segmentation',
    src: 'media/semantic/stuttgart_triptych_sem',
    poster: true,
    credit: CS, // the tabs' Stuttgart footage
    caption: 'Every pixel gets a class: road, sidewalk, car, person, tree, sky. It is how a car knows where it can drive.',
  },
  {
    label: 'Boxes', term: 'object detection',
    src: 'media/local/stuttgart_triptych_det',
    opts: { mediaSrc: TRIPTYCH_MP4, labels: true },
    caption: 'A box and a class for every object. The fastest way to count, track and avoid things.',
  },
  {
    label: 'Outlines', term: 'instance segmentation',
    src: 'media/local/stuttgart_triptych_seg',
    opts: { mediaSrc: TRIPTYCH_MP4, labels: true },
    caption: 'The exact outline of each object, so two people standing close together stay two separate people.',
  },
  {
    label: 'Keypoints', term: 'keypoint estimation',
    src: 'media/local/stuttgart_triptych_kpts',
    opts: { mediaSrc: TRIPTYCH_MP4, labels: false },
    caption: 'Named points on each object. This model is trained on human pose, 17 joints per person; train it on your own labels and it finds any keypoints you need.',
  },
];

// 1-2 examples per task; order = grid order (wide cards span both columns).
export const GALLERY = [
  {
    src: 'media/local/radio_galaxies', poster: true, wide: true,
    opts: { boxes: true }, // keypoint clip: show the source boxes too, not only the host points
    kicker: 'Astronomy · keypoints',
    title: 'Radio galaxies and their hosts',
    caption: 'Jets from a black hole glow in radio (amber). The galaxy that launched them is a faint infrared dot (gray), often far from the brightest radio. The model boxes each radio galaxy, names its type and pins its host: 70.5 host AP vs 48.2, ahead of every published model.',
    meta: 'S model · RadioGalaxyNET (EMU pilot survey) · host keypoint AP 70.5 vs 48.2 (Gal-DINO), box AP 67.1 vs 54.5 (best published) · 1.8 ms vs 11.6 ms · held-out val / test images',
    credit: 'Radio galaxy images: RadioGalaxyNET (Gupta et al., PASA 2024; CSIRO, EMU pilot survey radio + WISE infrared), CC BY-NC-SA 4.0, re-rendered for display',
  },
  {
    src: 'media/semantic/iron_belt_things_sem', poster: true, wide: true,
    kicker: 'Mining · pixels',
    title: 'Foreign objects on an ore belt',
    caption: 'A hammer and a folding tool hidden in iron ore at full belt speed. The ore is mapped, and each foreign object is flagged before it can jam the crusher.',
    meta: 'L model · 83.1 mIoU on held-out videos · lab-scale conveyor rig',
    credit: 'Iron ore conveyor: Sousa et al., "In-lab Image Dataset of Foreign Objects and Anomalies in Iron Ore Conveyor Belts", Mendeley Data, CC BY 4.0',
  },
  {
    src: 'media/web/web_sem_reef_lady_musgrave', poster: true,
    kicker: 'Underwater · pixels',
    title: 'Great Barrier Reef survey',
    caption: 'A reef model trained on Red Sea surveys, run on a swim over the other side of the world. Live coral by type, sand, rock and fish.',
    meta: 'X model · Coralscapes, 39 classes · 58.4 mIoU at 15 ms vs SegFormer-B5 58.2 at 39 ms',
    credit: 'Reef footage: Adam Fish, CC BY 3.0, Wikimedia Commons ("Lady Musgrave Island coral survey 2022")',
  },
  {
    src: 'media/web/web_kpts_street_dance', poster: true,
    kicker: 'Dance · keypoints',
    title: 'Street dance',
    caption: 'Five dancers, 17 joints each, through every move. Hollow joints are ones the model knows are hidden.',
    meta: 'S model · 65.4 keypoint AP at 2.1 ms (YOLO26s-pose: 62.7)',
    credit: MIXKIT('mixkit.co/free-stock-video/five-young-people-dancing-a-choreography-in-the-street-51295'),
  },
  {
    src: 'media/web/web_det_shibuya', poster: true, wide: true,
    kicker: 'City · boxes',
    title: 'Shibuya crossing',
    caption: 'Around 190 people in every frame, down to the far side of the crossing. A model trained on drone footage, looking down from above.',
    meta: 'X model at 1280 px input · trained on VisDrone',
    credit: `Shibuya footage: ${MIXKIT('mixkit.co/free-stock-video/crowds-of-people-cross-a-street-junction-4401')}; model trained on VisDrone (AISKYEYE, Tianjin University), non-commercial research use`,
  },
  {
    src: 'media/web/web_sem_goose_camper_track', poster: true, wide: true,
    opts: { palette: GOOSE_PALETTE },
    kicker: 'Off-road · pixels',
    title: 'Camper on a rocky track',
    caption: 'A camera on an expedition camper crawling over rocks. The off-road model from the top of the page maps the ground, bushes, single rocks and the camper itself.',
    meta: 'X model · GOOSE, 11 classes · 69.8 mIoU at 2048×1024',
    credit: `Camper footage: ${MIXKIT('mixkit.co/free-stock-video/campervan-driving-on-rough-tracks-4245')}; same GOOSE model as the hero`,
  },
  {
    src: 'media/local/m3fd_headlights_ir', wide: true,
    views: [{ label: 'Thermal', src: 'media/local/m3fd_headlights_ir' }, { label: 'Visible', src: 'media/local/m3fd_headlights_vis' }],
    kicker: 'Thermal · boxes',
    title: 'Blinded by headlights',
    caption: 'Glare hides the oncoming car from a regular camera, and the far car on the right barely shows in thermal. The model reads both cameras at once and finds all seven cars and both people. Switch views in the viewer.',
    meta: 'L model · 4-channel RGB + thermal input · 93.1 mAP50 on M3FD test',
    credit: 'Thermal + visible images: M3FD dataset (Liu et al., CVPR 2022), research use',
  },
];

export const BENCH = [["D-FINE-seg-N", "D-FINE-seg", 77.99, 4.21, 3.36], ["D-FINE-seg-S", "D-FINE-seg", 81.12, 6.37, 7.99], ["D-FINE-seg-M", "D-FINE-seg", 81.41, 8.26, 15.95], ["D-FINE-seg-L", "D-FINE-seg", 83.8, 9.77, 24.97], ["D-FINE-seg-X", "D-FINE-seg", 84.84, 14.64, 56.3], ["YOLO26n-sem", "YOLO26-sem", 78.25, 4.71, 1.63], ["YOLO26s-sem", "YOLO26-sem", 80.8, 5.52, 6.49], ["YOLO26m-sem", "YOLO26-sem", 82.02, 7.54, 14.3], ["YOLO26l-sem", "YOLO26-sem", 82.95, 8.77, 17.85], ["YOLO26x-sem", "YOLO26-sem", 83.58, 13.58, 40.13], ["SegFormer-B0", "SegFormer", 74.43, 8.78, 3.72], ["SegFormer-B1", "SegFormer", 77.42, 12.32, 13.68], ["SegFormer-B2", "SegFormer", 79.94, 23.46, 27.36], ["SegFormer-B3", "SegFormer", 80.77, 29.43, 47.24], ["SegFormer-B4", "SegFormer", 81.15, 36.78, 64.01], ["SegFormer-B5", "SegFormer", 81.41, 42.12, 84.61], ["EfficientViT-B0", "EfficientViT", 75.63, 11.9, 0.71], ["EfficientViT-B1", "EfficientViT", 80.53, 13.35, 4.8], ["EfficientViT-B2", "EfficientViT", 82.06, 16.25, 15.32], ["EfficientViT-B3", "EfficientViT", 83.01, 21.58, 39.6], ["EfficientViT-L1", "EfficientViT", 82.64, 17.78, 40.24], ["EfficientViT-L2", "EfficientViT", 83.2, 19.87, 52.61], ["Mask2Former-R50", "Mask2Former", 79.3, 66.51, 44.01], ["Mask2Former-R101", "Mask2Former", 79.72, 68.93, 63.0], ["Mask2Former-Swin-T", "Mask2Former", 82.19, 69.33, 47.41], ["Mask2Former-Swin-S", "Mask2Former", 82.43, 73.32, 68.72], ["Mask2Former-Swin-B", "Mask2Former", 83.29, 79.85, 106.89], ["Mask2Former-Swin-L", "Mask2Former", 83.33, 94.07, 215.46]];

// ---------------------------------------------------------------- static text (SEO / AI crawlers)
// Everything below is written into index.html (and llms.txt) by `node tools/prerender.mjs`;
// main.js does not read it. Run the prerender after editing any of it, then deploy.

const CS_BENCH = 'https://github.com/ArgoHA/cityscapes-benchmark';
const RG_BENCH = 'https://github.com/ArgoHA/radiogalaxynet-dfine-vs-galdino';
const PROTOCOL = 'End-to-end latency (each framework\'s own pre- and postprocessing), TensorRT FP16, batch 1, RTX 5070 Ti.';

// "All the numbers" tables under the speed section. A row whose first cell starts with D-FINE-seg is highlighted.
export const RESULTS = [
  {
    title: 'Cityscapes semantic segmentation, whole 2048×1024 frames',
    cols: ['Model', 'mIoU', 'Latency (ms)', 'Params (M)'],
    rows: [...BENCH].sort((a, b) => b[2] - a[2]).map((r) => [r[0], r[2].toFixed(2), r[3].toFixed(2), r[4].toFixed(2)]),
    note: `Cityscapes val, 500 images, one forward pass per frame. D-FINE-seg sizes trained by us; the other 23 are the official checkpoints, not retrained. ${PROTOCOL}`,
    link: [CS_BENCH, 'Protocol and per-class IoU: cityscapes-benchmark'],
  },
  {
    title: 'Cityscapes object detection at 640',
    cols: ['Model', 'F1', 'Precision', 'Recall', 'Latency (ms)', 'Params (M)'],
    rows: [
      ['D-FINE-seg S', '0.703', '0.817', '0.617', '2.0', '10.3'],
      ['YOLO26-M', '0.691', '0.792', '0.613', '3.0', '21.8'],
      ['RF-DETR-medium', '0.673', '0.769', '0.599', '10.2', '33.4'],
    ],
    note: `Every model fine-tuned by us on Cityscapes, scored on the 500 val images, confidence threshold tuned per framework for the best F1. D-FINE-seg and YOLO26 run at 640×640, RF-DETR at its own default resolution (576×576). ${PROTOCOL}`,
    link: [CS_BENCH, 'Protocol: cityscapes-benchmark'],
  },
  {
    title: 'Cityscapes instance segmentation at 640',
    cols: ['Model', 'F1', 'Precision', 'Recall', 'Latency (ms)', 'Params (M)'],
    rows: [
      ['D-FINE-seg S', '0.661', '0.748', '0.592', '3.1', '11.9'],
      ['RF-DETR-seg-medium', '0.620', '0.789', '0.510', '16.8', '35.4'],
      ['YOLO26-M', '0.599', '0.688', '0.530', '5.3', '27.0'],
    ],
    note: `Same protocol as detection; RF-DETR-seg-medium runs at its own default resolution (432×432). ${PROTOCOL}`,
    link: [CS_BENCH, 'Protocol: cityscapes-benchmark'],
  },
  {
    title: 'Cityscapes semantic segmentation at 640',
    cols: ['Model', 'mIoU', 'Latency (ms)', 'Params (M)'],
    rows: [
      ['D-FINE-seg M', '75.3', '2.24', '16.0'],
      ['YOLO26-L', '73.9', '3.56', '17.9'],
      ['YOLO26-M', '73.3', '3.08', '14.3'],
      ['D-FINE-seg S', '72.8', '1.79', '8.0'],
    ],
    note: `Every model fine-tuned by us on Cityscapes at 640×640, scored on the 500 val images at original resolution. Superseded by the full-resolution table above; the S row is the 1.8 ms semantic segmentation figure in the speed tiles. ${PROTOCOL}`,
    link: [CS_BENCH, 'Protocol: cityscapes-benchmark'],
  },
  {
    title: 'COCO person keypoints (human pose)',
    cols: ['Model', 'Keypoint AP', 'AP50', 'AP75', 'Person box AP', 'Latency (ms)'],
    rows: [
      ['D-FINE-seg S', '65.4', '88.0', '71.1', '64.2', '2.10'],
      ['YOLO26s-pose', '62.7', '85.8', '68.8', '54.3', '2.16'],
    ],
    note: `COCO val2017 at 640, official COCO AP. D-FINE-seg S trained for 40 epochs; YOLO26s-pose is the released checkpoint (300 epochs, Objects365 init). ${PROTOCOL}`,
    link: ['https://github.com/ArgoHA/D-FINE-seg/blob/main/CHANGELOG.md', 'Details: D-FINE-seg changelog'],
  },
  {
    title: 'RadioGalaxyNET: radio galaxies and their infrared hosts',
    cols: ['Model', 'Box AP', 'Host keypoint AP', 'Latency (ms)', 'Params (M)', 'Input'],
    rows: [
      ['D-FINE-seg S', '67.1', '70.5', '1.8', '13.4', '640'],
      ['Gal-DINO (published model)', '53.8', '48.2', '11.6', '47', '800'],
    ],
    note: `Test split, 420 images, 611 sources, both models scored with Gal-DINO's own evaluation (paper: 53.7 box AP, 48.1 host AP). Over three training seeds D-FINE-seg S scores 66.4 ± 0.7 box AP and 70.9 ± 0.4 host AP. The best published box AP is 54.5 (Gal-YOLOv8, same paper, no hosts). ${PROTOCOL}`,
    link: [RG_BENCH, 'Code and raw predictions: radiogalaxynet-dfine-vs-galdino'],
  },
];

// "Questions" box (collapsed, at the end of the page). Answers may use <a> and <code>; llms.txt converts them to Markdown.
// Kept to facts the rest of the page doesn't state in plain sentences: what it is, license, comparisons, custom keypoints, extra channels, training.
export const FAQ = [
  {
    q: 'What is D-FINE-seg?',
    a: 'An open-source framework and model family for real-time object detection, keypoint estimation, instance and semantic segmentation. One codebase, one config setting per task (<code>task: detect | segment | sem_seg | kpts</code>), five model sizes from N to X, from training to export and deployment. The detection core follows <a href="https://arxiv.org/abs/2410.13842">D-FINE</a>, a real-time detector from the DETR (detection transformer) family; the segmentation and keypoint heads and the rest of the pipeline are written from scratch.',
  },
  {
    q: 'Can I use it commercially?',
    a: 'Yes. The code and the released COCO weights are Apache-2.0, not AGPL-3.0 like Ultralytics YOLO, and models you train on your own data are yours to ship. Only the Cityscapes semantic segmentation weights are non-commercial, inherited from the dataset.',
  },
  {
    q: 'How does it compare with YOLO26 and RF-DETR?',
    a: 'On Cityscapes semantic segmentation at full 2048×1024, D-FINE-seg-X reaches 84.84 mIoU, the highest of 28 models, and D-FINE-seg-L matches YOLO26x-sem at lower latency. On Cityscapes detection and instance segmentation, the S model beats the larger YOLO26-M and RF-DETR-medium on F1 and is faster. On COCO person keypoints, S scores 65.4 AP vs 62.7 for YOLO26s-pose at the same latency. All end to end with TensorRT FP16 on one RTX 5070 Ti; tables under "All the numbers".',
  },
  {
    q: 'Can it find keypoints other than human pose?',
    a: 'Yes. Each detected object gets K points with a presence and a visibility score, so the model learns whatever points your labels define, like the host galaxy of a radio source in the demo above. Labels can be YOLO-pose or COCO keypoints. The released weights are trained on COCO human pose and are a good starting point.',
  },
  {
    q: 'Does it work with thermal, depth or other extra channels?',
    a: 'Yes. Train on RGB plus one extra channel (thermal, depth or near-infrared); pretrained RGB weights still initialize the model. The "Blinded by headlights" demo reads RGB and thermal together: 93.1 mAP50 on M3FD.',
  },
  {
    q: 'How do I train it on my own data?',
    a: '<code>pip install dfine-seg</code>, put images and labels in YOLO or COCO format, set the task and model size in the config, train. Export and benchmarking are one command each. See the <a href="https://github.com/ArgoHA/D-FINE-seg#quick-start">quick start</a>, the <a href="https://youtu.be/_uEyRRw4miY">video tutorial</a> or the <a href="https://colab.research.google.com/drive/1ZV12qnUQMpC0g3j-0G-tYhmmdM98a41X?usp=sharing">Colab notebook</a>.',
  },
];

// Head of llms.txt (https://llmstxt.org). The FAQ, results and gallery follow it.
export const LLMS = {
  summary: 'Open-source (Apache-2.0) framework and model family for real-time object detection, keypoint estimation, instance and semantic segmentation. Train on your own data, export to TensorRT, ONNX, OpenVINO, CoreML or LiteRT, and run from Python or a C++ runtime.',
  links: [
    ['Project page: interactive demos and benchmarks', 'https://dfine-seg.argoai.space/'],
    ['Source code, docs and quick start', 'https://github.com/ArgoHA/D-FINE-seg'],
    ['Python package (pip install dfine-seg)', 'https://pypi.org/project/dfine-seg/'],
    ['Pretrained weights', 'https://huggingface.co/ArgoSA/D-FINE-seg'],
    ['Paper (detection and instance segmentation)', 'https://arxiv.org/abs/2602.23043'],
    ['Cityscapes benchmark vs YOLO26, RF-DETR, SegFormer, Mask2Former, EfficientViT', CS_BENCH],
    ['RadioGalaxyNET comparison vs Gal-DINO', RG_BENCH],
    ['Author: Argo Saakyan', 'https://argoai.space/'],
  ],
};
