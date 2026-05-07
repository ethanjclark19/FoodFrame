const app = document.querySelector("#app");
const triviaNames = ["Ava", "Mia", "Leo", "Noah", "Zoe", "Eli", "Luna", "Kai", "Ivy", "Milo"];

const state = {
  screen: "camera",
  stream: null,
  recorder: null,
  chunks: [],
  recording: false,
  recordingStartedAt: 0,
  timerId: null,
  video: null,
  videoUrl: "",
  trim: { start: 0, end: 15 },
  ingredients: [],
  cookingSteps: [],
  importMetadata: null,
  history: loadHistory(),
  savedRecipes: loadSavedRecipes(),
  recipeFeedVersion: Number(localStorage.getItem("foodframe-recipe-feed-version") || 0),
  recipeLastUpdated: localStorage.getItem("foodframe-recipe-updated") || "Today",
  cameraError: "",
  cameraTried: false,
  tiktokUrl: "",
  logoTaps: 0,
  easterEggOpen: false,
  triviaRound: makeTriviaRound(),
  triviaScore: 0,
  triviaMessage: "Guess the name before the timer vibe runs out.",
  recipeCategory: "Viral",
};

const demoIngredients = [
  {
    name: "Chicken breast",
    confidence: "high",
    confidenceScore: 92,
    amount: "About 1 large breast, sliced",
    category: "Protein",
    state: "Raw, then pan-cooked",
    actions: ["sliced", "added to pan", "fried"],
    seenAt: "0:04, 0:11, 0:18",
    visualEvidence: "Pale pink strips are placed into a hot pan and become opaque while cooking.",
    possibleAlternatives: "Could be turkey cutlets if the video color is washed out.",
    notes: "Main protein. High confidence because it is visible before and after cooking.",
  },
  {
    name: "Garlic",
    confidence: "medium",
    confidenceScore: 74,
    amount: "1-2 cloves, minced",
    category: "Aromatic",
    state: "Minced",
    actions: ["chopped", "added to pan", "mixed"],
    seenAt: "0:06, 0:09",
    visualEvidence: "Small pale minced pieces are scraped from the cutting board into the pan.",
    possibleAlternatives: "Could be minced ginger or onion if the clip is blurry.",
    notes: "Marked medium because the pieces are small and partly covered by the hand.",
  },
  {
    name: "Olive oil",
    confidence: "high",
    confidenceScore: 88,
    amount: "1-2 tablespoons",
    category: "Oil / fat",
    state: "Liquid",
    actions: ["poured", "heated"],
    seenAt: "0:02",
    visualEvidence: "Glossy yellow liquid is poured into the pan before ingredients are added.",
    possibleAlternatives: "Could be another cooking oil such as avocado or vegetable oil.",
    notes: "Likely oil used to coat the pan.",
  },
  {
    name: "Onion",
    confidence: "medium",
    confidenceScore: 68,
    amount: "About 1/4 onion, diced",
    category: "Vegetable / aromatic",
    state: "Diced",
    actions: ["chopped", "mixed"],
    seenAt: "0:07, 0:14",
    visualEvidence: "White translucent diced pieces appear beside the garlic and soften in the pan.",
    possibleAlternatives: "Could be shallot based on size and color.",
    notes: "Medium confidence because garlic and onion overlap visually.",
  },
  {
    name: "Black pepper",
    confidence: "low",
    confidenceScore: 41,
    amount: "Small pinch",
    category: "Seasoning",
    state: "Ground",
    actions: ["sprinkled"],
    seenAt: "0:20",
    visualEvidence: "Dark specks appear on top of the chicken after a shaker motion.",
    possibleAlternatives: "Could be chili flakes, char, or another dark seasoning.",
    notes: "Uncertain result. Keep or edit after reviewing the clip.",
  },
];

const demoCookingSteps = [
  {
    title: "Prep the aromatics",
    time: "0:02-0:08",
    instruction: "Mince the garlic and dice the onion on the cutting board.",
    evidence: "Knife movement and small chopped pieces are visible before they are moved toward the pan.",
  },
  {
    title: "Heat the pan",
    time: "0:09-0:11",
    instruction: "Pour oil into the pan and let it heat briefly.",
    evidence: "Glossy oil spreads across the pan before the main ingredients are added.",
  },
  {
    title: "Cook the chicken",
    time: "0:12-0:22",
    instruction: "Add chicken strips to the pan and fry until the pieces turn opaque and lightly browned.",
    evidence: "Chicken changes from pale pink to cooked white/golden while being stirred.",
  },
  {
    title: "Season and mix",
    time: "0:23-0:28",
    instruction: "Sprinkle seasoning over the pan and mix everything together.",
    evidence: "A shaker motion appears above the pan, followed by stirring.",
  },
  {
    title: "Finish",
    time: "0:29-end",
    instruction: "Continue stirring until the aromatics soften and the chicken looks fully cooked.",
    evidence: "Final frames show combined ingredients in the pan.",
  },
];

const tasteComments = [
  {
    name: "Maya",
    time: "2 min ago",
    text: "Tasted way better with extra garlic. Super easy weeknight dinner.",
  },
  {
    name: "Jay",
    time: "12 min ago",
    text: "Good flavor, but I would add lemon at the end to brighten it up.",
  },
  {
    name: "Sam",
    time: "28 min ago",
    text: "Chicken came out juicy. Needs a little heat if you like spicy food.",
  },
];

const recipeCategories = ["Viral", "Quick", "Healthy", "Comfort", "Saved"];

const popularRecipes = [
  {
    title: "Baked Feta Tomato Pasta",
    category: "Viral",
    time: "30 min",
    why: "Still popular online because it is creamy, visual, and easy.",
    ingredients: ["8 oz pasta", "1 block feta", "2 cups cherry tomatoes", "2 tbsp olive oil", "2 cloves garlic", "Basil"],
    steps: ["Bake feta, tomatoes, oil, and garlic at 400°F until soft.", "Boil pasta and save a splash of pasta water.", "Mash the baked feta and tomatoes into sauce, then toss with pasta."],
  },
  {
    title: "Salmon Rice Bowl",
    category: "Viral",
    time: "15 min",
    why: "A social-feed favorite for leftovers, protein, and easy toppings.",
    ingredients: ["1 salmon fillet", "1 cup cooked rice", "1 tbsp soy sauce", "1 tsp sriracha", "1/2 avocado", "Seaweed"],
    steps: ["Warm rice and flake salmon over the top.", "Add soy sauce, sriracha, and avocado.", "Serve with seaweed or cucumber for crunch."],
  },
  {
    title: "Chopped Italian Sandwich",
    category: "Viral",
    time: "12 min",
    why: "Popular because every bite has the full chopped filling.",
    ingredients: ["Hoagie roll", "Deli turkey or salami", "Provolone", "Lettuce", "Tomato", "Italian dressing"],
    steps: ["Chop meat, cheese, lettuce, tomato, and dressing together.", "Pile the chopped mix into a toasted roll.", "Slice and serve right away."],
  },
  {
    title: "Lemon Garlic Chicken Sheet Pan",
    category: "Quick",
    time: "35 min",
    why: "Useful weeknight dinner with protein and vegetables on one pan.",
    ingredients: ["4 chicken thighs", "1 lemon", "3 cloves garlic", "2 tbsp olive oil", "2 cups potatoes", "1 cup carrots"],
    steps: ["Toss chicken and vegetables with lemon, garlic, oil, salt, and pepper.", "Roast at 425°F until chicken is cooked and vegetables are tender.", "Squeeze extra lemon over the pan before serving."],
  },
  {
    title: "20-Minute Chickpea Curry",
    category: "Quick",
    time: "20 min",
    why: "Fast, cheap, filling, and easy to make from pantry ingredients.",
    ingredients: ["1 can chickpeas", "1 cup coconut milk", "1/2 onion", "2 cloves garlic", "1 tbsp curry powder", "Rice"],
    steps: ["Cook onion and garlic until soft.", "Add chickpeas, coconut milk, and curry powder.", "Simmer until creamy and serve over rice."],
  },
  {
    title: "High-Protein Cottage Cheese Bowl",
    category: "Healthy",
    time: "5 min",
    why: "High-protein bowls are popular for quick meals and meal prep.",
    ingredients: ["1 cup cottage cheese", "1/2 cup berries", "1 tbsp honey", "2 tbsp granola", "Chia seeds"],
    steps: ["Spoon cottage cheese into a bowl.", "Top with berries, honey, granola, and chia.", "Eat cold for breakfast, snack, or post-workout."],
  },
  {
    title: "Acai Smoothie Bowl",
    category: "Healthy",
    time: "10 min",
    why: "A popular search-friendly bowl with fruit, color, and crunch.",
    ingredients: ["1 acai packet", "1 banana", "1/2 cup berries", "1/4 cup milk", "Granola", "Peanut butter"],
    steps: ["Blend acai, banana, berries, and milk until thick.", "Pour into a bowl.", "Top with granola, fruit, and peanut butter."],
  },
  {
    title: "Buffalo Chicken Dip",
    category: "Comfort",
    time: "25 min",
    why: "A highly searched comfort snack for parties and game nights.",
    ingredients: ["2 cups shredded chicken", "4 oz cream cheese", "1/2 cup buffalo sauce", "1/2 cup ranch", "1 cup cheddar"],
    steps: ["Mix chicken, cream cheese, buffalo sauce, ranch, and cheddar.", "Bake at 375°F until bubbly.", "Serve with chips, celery, or bread."],
  },
  {
    title: "Banana Bread Snack Loaf",
    category: "Comfort",
    time: "60 min",
    why: "A dependable internet favorite when people have ripe bananas.",
    ingredients: ["3 ripe bananas", "2 eggs", "1/2 cup sugar", "1/3 cup oil", "1 1/2 cups flour", "1 tsp baking soda"],
    steps: ["Mash bananas and mix with eggs, sugar, and oil.", "Fold in flour and baking soda.", "Bake at 350°F until the center is set."],
  },
];

const recipeUpdatePool = [
  {
    title: "Crispy Hot Honey Chicken Bowl",
    category: "Viral",
    time: "25 min",
    why: "Sweet-spicy bowls are popular because they feel like takeout but are easy at home.",
    ingredients: ["2 chicken cutlets", "1 tbsp hot honey", "1 cup rice", "1 cup cucumber", "1/2 avocado", "Ranch or yogurt sauce"],
    steps: ["Cook chicken until crisp and slice it.", "Add rice, cucumber, avocado, and sauce to a bowl.", "Drizzle with hot honey before serving."],
  },
  {
    title: "Garlic Butter Salmon Bites",
    category: "Quick",
    time: "18 min",
    why: "Fast protein bites are easy to film, easy to meal prep, and quick to cook.",
    ingredients: ["1 lb salmon", "2 tbsp butter", "2 cloves garlic", "1/2 lemon", "Parsley", "Rice or salad"],
    steps: ["Cut salmon into cubes and season.", "Sear in butter and garlic until cooked.", "Finish with lemon and parsley."],
  },
  {
    title: "Greek Chicken Meal Prep Box",
    category: "Healthy",
    time: "35 min",
    why: "High-protein meal prep keeps trending because it saves time all week.",
    ingredients: ["2 chicken breasts", "1 cup rice", "1 cucumber", "1 tomato", "1/2 cup tzatziki", "Feta"],
    steps: ["Season and cook chicken.", "Add rice, cucumber, tomato, tzatziki, and feta to containers.", "Serve cold or warm the chicken and rice first."],
  },
  {
    title: "Loaded Tater Tot Casserole",
    category: "Comfort",
    time: "45 min",
    why: "Comfort casseroles stay popular because they are low effort and crowd-friendly.",
    ingredients: ["1 lb ground beef", "1 bag tater tots", "1 cup cheddar", "1/2 cup sour cream", "Green onion", "Seasoning"],
    steps: ["Cook beef with seasoning.", "Layer beef, cheese, and tater tots in a baking dish.", "Bake until crisp, then top with sour cream and green onion."],
  },
];

function html(strings, ...values) {
  return strings.map((part, i) => part + (values[i] ?? "")).join("");
}

function setScreen(screen) {
  state.screen = screen;
  render();
}

function render() {
  if (state.screen === "camera") renderCamera();
  if (state.screen === "preview") renderPreview();
  if (state.screen === "loading") renderLoading();
  if (state.screen === "results") renderResults();
  if (state.screen === "history") renderHistory();
  if (state.screen === "tiktok") renderTikTokImport();
  if (state.screen === "trivia") renderTrivia();
  if (state.screen === "recipes") renderRecipes();
}

async function ensureCamera() {
  if (state.stream || !navigator.mediaDevices?.getUserMedia) return;
  state.cameraTried = true;
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    state.cameraError = "";
  } catch (error) {
    state.cameraError = "Camera unavailable here. Upload a video from your gallery instead.";
  }
}

function renderCamera() {
  app.innerHTML = html`
    <section class="screen home-screen">
      <div class="home-orbs" aria-hidden="true"></div>
      <div class="camera-top home-top">
        <button class="brand" type="button" data-action="logo-egg" aria-label="FoodFrame hidden surprise"><span class="brand-mark">F</span>FoodFrame</button>
        <button class="icon-button" type="button" data-action="history" aria-label="Open saved history">≡</button>
      </div>
      <div class="home-hero">
        <div class="hero-card">
          <div class="phone-video">
            <div class="cutting-board">
              <div class="knife"></div>
              <div class="tomato whole-tomato"></div>
              <div class="tomato-slice slice-one"></div>
              <div class="tomato-slice slice-two"></div>
              <div class="lemon"><span></span></div>
              <div class="carrot"></div>
              <div class="garlic-clove"></div>
              <div class="herbs"></div>
            </div>
            <div class="pan">
              <span class="steam steam-a"></span>
              <span class="steam steam-b"></span>
              <span class="steam steam-c"></span>
              <span class="chicken-leg leg-a"><i></i></span>
              <span class="chicken-leg leg-b"><i></i></span>
              <span class="chicken-leg leg-c"><i></i></span>
            </div>
            <div class="ingredient-dot dot-a">Tomato</div>
            <div class="ingredient-dot dot-b">Lemon</div>
            <div class="ingredient-dot dot-c">Chicken</div>
            <div class="ai-pill">Frame scan</div>
          </div>
        </div>
        <div class="bento-row">
          <div class="mini-card wide">
            <strong>Find ingredients</strong>
            <span>from video frames</span>
          </div>
          <div class="mini-card">
            <strong>Actions</strong>
            <span>chopped, poured, fried</span>
          </div>
        </div>
        <h1>Recipe videos, decoded.</h1>
        <p>Choose a video, import a link, then review ingredients and steps.</p>
      </div>
      <div class="home-actions">
        <label class="main-action upload-action" aria-label="Upload TikTok cooking video">
          <span class="action-icon">↑</span>
          <span>
            <strong>Upload from phone</strong>
            <small>Best for saved TikTok clips</small>
          </span>
          <input id="uploadInput" class="file-input" type="file" accept="video/*" />
        </label>
        <button class="main-action import-action" type="button" data-action="tiktok" aria-label="Import TikTok cooking feed">
          <span class="action-icon">↗</span>
          <span>
            <strong>Paste TikTok link</strong>
            <small>Reads caption first</small>
          </span>
        </button>
        <button class="main-action recipes-action" type="button" data-action="recipes" aria-label="Open popular recipes">
          <span class="action-icon">★</span>
          <span>
            <strong>Popular recipes</strong>
            <small>Ideas people love</small>
          </span>
        </button>
        <button class="main-action trivia-action" type="button" data-action="trivia" aria-label="Play name scramble trivia">
          <span class="action-icon">?</span>
          <span>
            <strong>Name Scramble</strong>
            <small>Quick trivia break</small>
          </span>
        </button>
      </div>
      <div class="sample-strip">
        <span>chopped</span>
        <span>poured</span>
        <span>mixed</span>
        <span>fried</span>
      </div>
      <p class="privacy-note">Privacy: uploads stay in this browser prototype. A real app should ask permission before storing videos.</p>
      <div id="eggModal">${state.easterEggOpen ? renderEasterEgg() : ""}</div>
    </section>
  `;

  document.querySelector("[data-action='history']").addEventListener("click", () => setScreen("history"));
  document.querySelector("[data-action='tiktok']").addEventListener("click", () => setScreen("tiktok"));
  document.querySelector("[data-action='recipes']").addEventListener("click", () => setScreen("recipes"));
  document.querySelector("[data-action='trivia']").addEventListener("click", () => setScreen("trivia"));
  document.querySelector("[data-action='logo-egg']").addEventListener("click", handleLogoTap);
  document.querySelector("#uploadInput").addEventListener("click", (event) => {
    event.target.value = "";
  });
  document.querySelector("#uploadInput").addEventListener("change", onUpload);
  document.querySelector("[data-action='close-egg']")?.addEventListener("click", closeEasterEgg);
}

function handleLogoTap() {
  state.logoTaps += 1;
  if (state.logoTaps >= 5) {
    state.easterEggOpen = true;
    state.logoTaps = 0;
    renderCamera();
    return;
  }
  const modal = document.querySelector("#eggModal");
  if (modal) {
    modal.innerHTML = html`<div class="egg-toast">Secret snack ${state.logoTaps}/5</div>`;
    window.setTimeout(() => {
      const currentModal = document.querySelector("#eggModal");
      if (currentModal && !state.easterEggOpen) currentModal.innerHTML = "";
    }, 900);
  }
}

function renderEasterEgg() {
  return html`
    <div class="modal-backdrop egg-backdrop" role="dialog" aria-modal="true" aria-label="FoodFrame easter egg">
      <div class="egg-card">
        <div class="egg-burst" aria-hidden="true">✦</div>
        <h2>Chef Mode Found</h2>
        <p>You unlocked the hidden snack break. FoodFrame now officially respects your taste.</p>
        <div class="egg-chips">
          <span>+10 flavor</span>
          <span>secret mode</span>
          <span>name game ready</span>
        </div>
        <button class="primary" type="button" data-action="close-egg">Nice</button>
      </div>
    </div>
  `;
}

function closeEasterEgg() {
  state.easterEggOpen = false;
  renderCamera();
}

function renderRecipes() {
  const visibleRecipes = getVisibleRecipes();
  app.innerHTML = html`
    <section class="screen recipes-screen">
      <header class="header">
        <div class="title-block">
          <h1>Popular recipes</h1>
          <p>Updated ${escapeHtml(state.recipeLastUpdated)}. Save favorites or share them.</p>
        </div>
        <button class="icon-button" type="button" data-action="camera" aria-label="Back to home">×</button>
      </header>
      <button class="recipe-refresh" type="button" data-action="refresh-recipes">Refresh recipe ideas</button>
      <div class="recipe-tabs">
        ${recipeCategories
          .map(
            (category) => `
              <button class="${category === state.recipeCategory ? "active" : ""}" type="button" data-category="${escapeAttr(category)}">${escapeHtml(category)}</button>
            `,
          )
          .join("")}
      </div>
      <div class="recipe-list">
        ${
          visibleRecipes.length
            ? visibleRecipes.map(renderRecipeCard).join("")
            : `<div class="empty"><h2>No saved recipes yet</h2><p>Tap Save on any recipe to keep it here.</p></div>`
        }
      </div>
    </section>
  `;

  document.querySelector("[data-action='camera']").addEventListener("click", () => setScreen("camera"));
  document.querySelector("[data-action='refresh-recipes']").addEventListener("click", refreshRecipeFeed);
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.recipeCategory = button.dataset.category;
      renderRecipes();
    });
  });
  document.querySelectorAll("[data-save-recipe]").forEach((button) => {
    button.addEventListener("click", () => toggleSavedRecipe(button.dataset.saveRecipe));
  });
  document.querySelectorAll("[data-share-recipe]").forEach((button) => {
    button.addEventListener("click", () => shareRecipe(button.dataset.shareRecipe));
  });
}

function renderRecipeCard(recipe) {
  const id = getRecipeId(recipe);
  const saved = isRecipeSaved(id);
  return html`
    <article class="recipe-card">
      <div class="recipe-head">
        <div>
          <span>${escapeHtml(recipe.category)} • ${escapeHtml(recipe.time)}</span>
          <h2>${escapeHtml(recipe.title)}</h2>
        </div>
      </div>
      <p>${escapeHtml(recipe.why)}</p>
      <div class="recipe-card-actions">
        <button type="button" data-save-recipe="${escapeAttr(id)}">${saved ? "Saved" : "Save"}</button>
        <button type="button" data-share-recipe="${escapeAttr(id)}">Share</button>
      </div>
      <details>
        <summary>Ingredients</summary>
        <ul>
          ${recipe.ingredients.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </details>
      <details>
        <summary>How to make it</summary>
        <ol>
          ${recipe.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
      </details>
    </article>
  `;
}

function getRecipeFeed() {
  return [...popularRecipes, ...recipeUpdatePool.slice(0, state.recipeFeedVersion)];
}

function getVisibleRecipes() {
  if (state.recipeCategory === "Saved") return state.savedRecipes;
  return getRecipeFeed().filter((recipe) => recipe.category === state.recipeCategory);
}

function refreshRecipeFeed() {
  state.recipeFeedVersion = Math.min(recipeUpdatePool.length, state.recipeFeedVersion + 1);
  state.recipeLastUpdated = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
  localStorage.setItem("foodframe-recipe-feed-version", String(state.recipeFeedVersion));
  localStorage.setItem("foodframe-recipe-updated", state.recipeLastUpdated);
  renderRecipes();
}

function getRecipeById(id) {
  return [...getRecipeFeed(), ...state.savedRecipes].find((recipe) => getRecipeId(recipe) === id);
}

function getRecipeId(recipe) {
  return recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function isRecipeSaved(id) {
  return state.savedRecipes.some((recipe) => getRecipeId(recipe) === id);
}

function toggleSavedRecipe(id) {
  const recipe = getRecipeById(id);
  if (!recipe) return;
  if (isRecipeSaved(id)) {
    state.savedRecipes = state.savedRecipes.filter((item) => getRecipeId(item) !== id);
  } else {
    state.savedRecipes.unshift({ ...recipe, savedAt: new Date().toISOString() });
  }
  saveSavedRecipes(state.savedRecipes);
  renderRecipes();
}

async function shareRecipe(id) {
  const recipe = getRecipeById(id);
  if (!recipe) return;
  const text = formatRecipe(recipe);
  if (navigator.share) {
    await navigator.share({ title: recipe.title, text });
  } else {
    await navigator.clipboard?.writeText(text);
    alert("Recipe copied.");
  }
}

function formatRecipe(recipe) {
  return [
    recipe.title,
    `${recipe.category} • ${recipe.time}`,
    "",
    "Ingredients:",
    ...recipe.ingredients.map((item) => `- ${item}`),
    "",
    "How to make it:",
    ...recipe.steps.map((step, index) => `${index + 1}. ${step}`),
  ].join("\n");
}

function renderTrivia() {
  const round = state.triviaRound;
  app.innerHTML = html`
    <section class="screen trivia-screen">
      <header class="header">
        <div class="title-block">
          <h1>Name Scramble</h1>
          <p>Unscramble the name. Tiny brain snack, zero pressure.</p>
        </div>
        <button class="icon-button" type="button" data-action="camera" aria-label="Back to home">×</button>
      </header>
      <div class="trivia-card">
        <span class="trivia-kicker">Scrambled name</span>
        <div class="scramble-word">${escapeHtml(round.scrambled)}</div>
        <p>${escapeHtml(state.triviaMessage)}</p>
        <div class="trivia-options">
          ${round.options.map((option) => `<button type="button" data-answer="${escapeAttr(option)}">${escapeHtml(option)}</button>`).join("")}
        </div>
        <div class="trivia-score">
          <span>Score</span>
          <strong>${state.triviaScore}</strong>
        </div>
      </div>
      <button class="secondary trivia-skip" type="button" data-action="new-round">New scramble</button>
    </section>
  `;

  document.querySelector("[data-action='camera']").addEventListener("click", () => setScreen("camera"));
  document.querySelector("[data-action='new-round']").addEventListener("click", nextTriviaRound);
  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => chooseTriviaAnswer(button.dataset.answer));
  });
}

function chooseTriviaAnswer(answer) {
  if (answer === state.triviaRound.answer) {
    state.triviaScore += 1;
    state.triviaMessage = "You got it. The kitchen crowd is impressed.";
  } else {
    state.triviaMessage = `Close. It was ${state.triviaRound.answer}.`;
  }
  state.triviaRound = makeTriviaRound();
  renderTrivia();
}

function nextTriviaRound() {
  state.triviaMessage = "Fresh scramble. Trust your first instinct.";
  state.triviaRound = makeTriviaRound();
  renderTrivia();
}

function makeTriviaRound() {
  const answer = triviaNames[Math.floor(Math.random() * triviaNames.length)];
  const scrambled = scrambleName(answer);
  const options = shuffleList([answer, ...shuffleList(triviaNames.filter((name) => name !== answer)).slice(0, 2)]);
  return { answer, scrambled, options };
}

function scrambleName(name) {
  const letters = name.toUpperCase().split("");
  const scrambled = shuffleList(letters).join("");
  return scrambled === name.toUpperCase() ? letters.reverse().join("") : scrambled;
}

function shuffleList(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

async function toggleRecording() {
  if (state.recording) {
    stopRecording();
    return;
  }
  await ensureCamera();
  if (!state.stream || !window.MediaRecorder) {
    state.cameraError = "Recording is not available here. Upload a video instead.";
    alert("This browser is blocking camera recording. Use Upload, or open the app from a secure localhost/HTTPS page for recording.");
    renderCamera();
    return;
  }
  state.chunks = [];
  const mimeType = pickMimeType();
  state.recorder = mimeType ? new MediaRecorder(state.stream, { mimeType }) : new MediaRecorder(state.stream);
  state.recorder.ondataavailable = (event) => {
    if (event.data.size) state.chunks.push(event.data);
  };
  state.recorder.onstop = () => {
    const blob = new Blob(state.chunks, { type: state.recorder.mimeType || "video/webm" });
    loadVideo(blob, "recorded-cooking-video.webm");
  };
  state.recorder.start();
  state.recording = true;
  state.recordingStartedAt = Date.now();
  state.timerId = setInterval(updateRecordTimer, 250);
  renderCamera();
}

function stopRecording() {
  if (state.recorder?.state === "recording") state.recorder.stop();
  state.recording = false;
  clearInterval(state.timerId);
}

function updateRecordTimer() {
  const meta = document.querySelector("#recordMeta");
  if (!meta) return;
  const seconds = Math.max(0, Math.floor((Date.now() - state.recordingStartedAt) / 1000));
  meta.textContent = `Recording ${seconds}s`;
}

function pickMimeType() {
  const types = ["video/webm;codecs=vp9", "video/webm", "video/mp4"];
  return types.find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";
}

function onUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  loadVideo(file, file.name);
}

function loadVideo(file, name) {
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.video = { file, name, createdAt: new Date().toISOString() };
  state.videoUrl = URL.createObjectURL(file);
  state.trim = { start: 0, end: 15 };
  setScreen("preview");
}

function renderPreview() {
  app.innerHTML = html`
    <section class="screen">
      <header class="header">
        <div class="title-block">
          <h1>Preview</h1>
          <p>Trim the clip, then analyze visible ingredients.</p>
        </div>
        <button class="icon-button" type="button" data-action="retake" aria-label="Retake video">×</button>
      </header>
      <div class="preview-card">
        <video class="video-preview" src="${state.videoUrl}" controls playsinline></video>
      </div>
      <div class="panel trim-panel">
        <div class="privacy-note panel-note">Your clip is only previewed locally in this prototype. Production storage would need clear consent.</div>
        <div class="trim-row">
          <label class="field">Start sec<input id="trimStart" type="number" min="0" step="1" value="${state.trim.start}" /></label>
          <label class="field">End sec<input id="trimEnd" type="number" min="1" step="1" value="${state.trim.end}" /></label>
        </div>
        <div class="actions">
          <button class="secondary" type="button" data-action="retake">Retake</button>
          <button class="primary" type="button" data-action="analyze">Analyze</button>
        </div>
      </div>
    </section>
  `;

  document.querySelectorAll("[data-action='retake']").forEach((button) => button.addEventListener("click", retake));
  document.querySelector("[data-action='analyze']").addEventListener("click", startAnalysis);
  document.querySelector("#trimStart").addEventListener("input", (event) => (state.trim.start = Number(event.target.value || 0)));
  document.querySelector("#trimEnd").addEventListener("input", (event) => (state.trim.end = Number(event.target.value || 0)));
}

function retake() {
  state.video = null;
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl = "";
  state.cookingSteps = [];
  setScreen("camera");
}

async function startAnalysis() {
  setScreen("loading");
  const analysis = await analyzeCookingVideo({
    file: state.video.file,
    trim: state.trim,
    videoUrl: state.videoUrl,
  });
  state.ingredients = analysis.ingredients;
  state.cookingSteps = analysis.steps;
  setScreen("results");
}

function renderTikTokImport() {
  app.innerHTML = html`
    <section class="screen import-screen">
      <header class="header">
        <div class="title-block">
          <h1>Import recipe</h1>
          <p>Paste a cooking video link. FoodFrame turns it into ingredients and steps.</p>
        </div>
        <button class="icon-button" type="button" data-action="camera" aria-label="Back to camera">×</button>
      </header>
      <div class="import-comfort">
        <span class="comfort-icon">↗</span>
        <div>
          <strong>Bring in a saved recipe</strong>
          <p>Use any TikTok cooking link for this preview. The real app would connect through an approved import backend.</p>
        </div>
      </div>
      <div class="import-visual">
        <div class="import-tile active">
          <span>1</span>
          <strong>Add link</strong>
          <small>Paste the recipe URL</small>
        </div>
        <div class="import-tile">
          <span>2</span>
          <strong>Scan video</strong>
          <small>Find key cooking frames</small>
        </div>
        <div class="import-tile">
          <span>3</span>
          <strong>Get list</strong>
          <small>Edit and save results</small>
        </div>
      </div>
      <div class="panel import-panel clean">
        <label class="field link-field-wrap">
          Recipe link
          <input id="tiktokUrl" class="link-input" type="url" inputmode="url" autocomplete="url" placeholder="https://www.tiktok.com/@chef/video/..." spellcheck="false" value="${escapeAttr(state.tiktokUrl)}" />
        </label>
        <div class="import-note soft">
          Tip: FoodFrame reads the caption for amounts and prep steps, then the full app would confirm details with video frames.
        </div>
        <div class="privacy-note panel-note">Only paste links you have permission to use. FoodFrame should not scrape private or restricted videos.</div>
        <button class="primary" type="button" data-action="import">Analyze TikTok link</button>
      </div>
      <div class="import-examples">
        <button type="button" data-example="https://www.tiktok.com/@chef/video/chicken-garlic-lemon">Try food caption</button>
        <button type="button" data-example="https://www.tiktok.com/@cook">Try creator feed</button>
      </div>
    </section>
  `;

  document.querySelector("[data-action='camera']").addEventListener("click", () => setScreen("camera"));
  document.querySelector("#tiktokUrl").addEventListener("input", (event) => (state.tiktokUrl = event.target.value));
  document.querySelector("[data-action='import']").addEventListener("click", importTikTokFeed);
  document.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tiktokUrl = button.dataset.example;
      document.querySelector("#tiktokUrl").value = state.tiktokUrl;
    });
  });
}

async function importTikTokFeed() {
  const url = state.tiktokUrl.trim();
  if (!url) {
    alert("Paste a TikTok video, profile, or feed link first.");
    return;
  }
  state.importMetadata = null;
  state.video = {
    file: null,
    name: "TikTok cooking feed import",
    createdAt: new Date().toISOString(),
    source: "tiktok",
    sourceUrl: url,
  };
  state.videoUrl = "";
  setScreen("loading");
  const analysis = await analyzeTikTokFeed(url);
  state.ingredients = analysis.ingredients;
  state.cookingSteps = analysis.steps;
  setScreen("results");
}

async function analyzeTikTokFeed(url) {
  await delay(1500);

  try {
    const importResult = await requestTikTokImport(url);
    const analysis = buildTikTokAnalysis(importResult, url);
    state.importMetadata = importResult.metadata;
    if (state.video) state.video.name = importResult.metadata.title || "TikTok cooking link";
    return analysis;
  } catch (error) {
    state.importMetadata = {
      title: "TikTok link queued",
      authorName: "Backend not connected",
      sourceUrl: url,
      status: "Sample analysis shown because the TikTok import server could not be reached.",
    };
    console.warn("TikTok import fell back to sample analysis:", error);
  }

  // TikTok backend connection point:
  // - Do not scrape TikTok from this client-side browser app.
  // - Use an official/user-authorized TikTok API flow or an approved backend import.
  // - Backend should resolve feed/video URLs, download permitted videos, extract frames,
  //   and pass frames to the same AI vision pipeline used by uploaded videos.
  void url;
  return {
    ingredients: [
    {
      name: "Eggs",
      confidence: "high",
      confidenceScore: 93,
      amount: "2 eggs",
      category: "Protein / binder",
      state: "Raw, whisked",
      actions: ["cracked", "whisked", "mixed"],
      seenAt: "Clip 1, 0:03-0:08",
      visualEvidence: "Two eggs are cracked into a bowl and whisked until yellow.",
      possibleAlternatives: "No strong alternative detected.",
      notes: "High confidence because shell cracking and yolks are clearly visible.",
    },
    {
      name: "Flour",
      confidence: "medium",
      confidenceScore: 77,
      amount: "About 1 cup",
      category: "Dry ingredient",
      state: "Powder",
      actions: ["scooped", "poured", "mixed"],
      seenAt: "Clip 1, 0:10",
      visualEvidence: "White powder is added from a measuring cup into the bowl.",
      possibleAlternatives: "Could be cornstarch, powdered sugar, or baking mix.",
      notes: "Medium confidence because several white powders look similar.",
    },
    {
      name: "Butter",
      confidence: "medium",
      confidenceScore: 71,
      amount: "1 tablespoon",
      category: "Fat",
      state: "Solid, then melted",
      actions: ["melted", "stirred"],
      seenAt: "Clip 2, 0:04",
      visualEvidence: "Yellow cube melts in a hot pan before other ingredients are added.",
      possibleAlternatives: "Could be ghee or margarine.",
      notes: "Marked medium because packaging is not visible.",
    },
    {
      name: "Parsley",
      confidence: "low",
      confidenceScore: 39,
      amount: "Small garnish",
      category: "Herb",
      state: "Chopped",
      actions: ["sprinkled"],
      seenAt: "Clip 3, 0:13",
      visualEvidence: "Small green leaves are sprinkled over the finished dish.",
      possibleAlternatives: "Could be cilantro, basil, or green onion.",
      notes: "Uncertain herb. Review final garnish frame.",
    },
    ],
    steps: [
      {
        title: "Make the batter",
        time: "Clip 1, 0:03-0:13",
        instruction: "Crack eggs into a bowl, add flour, then whisk until the mixture looks smooth.",
        evidence: "Eggs and white powder are combined in the bowl with repeated whisking.",
      },
      {
        title: "Melt the butter",
        time: "Clip 2, 0:04-0:08",
        instruction: "Add butter to the hot pan and let it melt before adding the mixture.",
        evidence: "A yellow cube softens and spreads across the pan.",
      },
      {
        title: "Cook and garnish",
        time: "Clip 3, 0:10-0:15",
        instruction: "Cook until set, then add the green garnish at the end.",
        evidence: "Finished food is topped with a small amount of chopped green herb.",
      },
    ],
  };
}

async function requestTikTokImport(url) {
  const response = await fetch(`${getApiBase()}/api/tiktok-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "TikTok import failed.");
  }
  return payload;
}

function buildTikTokAnalysis(importResult, url) {
  const metadata = importResult.metadata || {};
  const caption = metadata.title || "";
  const captionInsights = readCaptionIngredients(caption);
  const recipeSteps = buildRecipeStepsFromCaption(caption, captionInsights);
  const found = captionInsights.map((insight) => ({
    name: insight.name,
    confidence: insight.confidence,
    confidenceScore: insight.confidenceScore,
    amount: insight.amount,
    category: insight.category,
    state: "Caption clue",
    actions: insight.actions,
    seenAt: "TikTok caption",
    visualEvidence: insight.captionLine,
    possibleAlternatives: "Confirm after the video-frame scan is connected.",
    notes: insight.note,
  }));

  const ingredients = found.length
    ? found
    : [
        {
          name: "Frame scan needed",
          confidence: "low",
          confidenceScore: 28,
          amount: "No clear ingredients named yet",
          category: "Import status",
          state: "Not confirmed",
          actions: ["metadata read"],
          seenAt: "TikTok link metadata",
          visualEvidence: cleanTikTokText(caption || "Caption was not available.", 120),
          possibleAlternatives: "Paste a more descriptive TikTok caption or connect the video-frame backend.",
          notes: "The link imported correctly, but the caption does not list ingredients. A frame scan is needed next.",
        },
      ];

  const sourceTitle = metadata.title || "TikTok cooking video";
  return {
    ingredients,
    steps: recipeSteps.length ? recipeSteps : buildFallbackRecipeSteps(found, metadata, url, sourceTitle),
  };
}

function readCaptionIngredients(caption) {
  const normalized = normalizeCaption(caption);
  if (!normalized) return [];
  const context = getCaptionContext(normalized);
  const ingredientPhrases = getIngredientPhrases(normalized);
  return ingredientKeywordMap
    .map((item) => {
      if (shouldSkipGenericIngredient(item.name, normalized)) return null;
      const keyword = item.keywords.find((word) => phraseExists(normalized, word));
      if (!keyword) return null;
      const actions = detectIngredientActions(item, normalized, context);
      const phrase = findIngredientPhrase(ingredientPhrases, keyword) || normalized;
      const detectedAmount = findAmountForIngredientPhrase(phrase, keyword) || findAmountNearKeyword(normalized, keyword);
      const amount = detectedAmount || getFallbackAmount(item.name);
      const captionLine = describeIngredientUse(item, amount, actions, context);
      const hasAmount = Boolean(detectedAmount);
      return {
        name: item.name,
        category: item.category,
        confidence: hasAmount ? "high" : "medium",
        confidenceScore: hasAmount ? 82 : 66,
        amount,
        actions: actions.length ? actions : ["mentioned"],
        captionLine,
        note: hasAmount
          ? `Added from the caption with a nearby amount: ${amount}.`
          : "Added from ingredient words found in the caption.",
      };
    })
    .filter(Boolean);
}

function shouldSkipGenericIngredient(name, text) {
  const lowerName = name.toLowerCase();
  const rules = {
    beef: ["new york strip", "steak"],
    steak: ["new york strip"],
    garlic: ["garlic cloves", "crushed garlic cloves", "garlic salt", "garlic and herb butter"],
    onion: ["shallot", "shallots"],
    butter: ["salted butter", "garlic and herb butter"],
    "olive oil": ["avocado oil"],
    cheese: ["parmesan cheese", "parmesan"],
    "black pepper": ["white pepper", "black pepper corns", "pepper corns", "peppercorns"],
    salt: ["garlic salt"],
  };
  return (rules[lowerName] || []).some((phrase) => text.includes(phrase));
}

function buildRecipeStepsFromCaption(caption, insights) {
  const normalized = normalizeCaption(caption);
  if (!normalized || !insights.length) return [];
  const sentences = getCaptionSentences(caption);
  const actionSentences = sentences.filter((sentence) => recipeActionWords.some((word) => sentence.toLowerCase().includes(word)));
  const steps = actionSentences.map((sentence, index) => ({
    title: getStepTitle(sentence, index),
    time: "Caption",
    instruction: cleanInstruction(sentence),
    evidence: "From the video description",
  }));
  if (steps.length) return steps.slice(0, 5);

  const ingredientNames = insights.map((item) => item.name.toLowerCase());
  const prepItems = insights.filter((item) => ["garlic", "onion"].includes(item.name.toLowerCase()));
  const seasonItems = insights.filter((item) => ["salt", "black pepper", "garlic"].includes(item.name.toLowerCase()));
  const protein = insights.find((item) => ["chicken", "beef", "eggs"].includes(item.name.toLowerCase()));
  const finishItems = insights.filter((item) => ["lemon", "lime", "parsley", "cheese"].includes(item.name.toLowerCase()));
  const fallback = [];
  if (prepItems.length) {
    fallback.push({
      title: "Prep flavor base",
      time: "Caption",
      instruction: `Get ${prepItems.map((item) => item.amount).join(" and ")} ready for flavor.`,
      evidence: "Built from caption ingredients",
    });
  }
  if (protein) {
    fallback.push({
      title: "Cook main ingredient",
      time: "Caption",
      instruction: `${protein.amount} is the main item; cook it with ${seasonItems.map((item) => item.name.toLowerCase()).join(", ") || "the seasonings"}.`,
      evidence: "Built from caption ingredients",
    });
  }
  if (finishItems.length) {
    fallback.push({
      title: "Finish the dish",
      time: "Caption",
      instruction: `Finish with ${finishItems.map((item) => item.amount).join(" and ")}.`,
      evidence: "Built from caption ingredients",
    });
  }
  if (!fallback.length && ingredientNames.length) {
    fallback.push({
      title: "Assemble ingredients",
      time: "Caption",
      instruction: `Use ${insights.map((item) => item.amount).join(", ")}.`,
      evidence: "Built from caption ingredients",
    });
  }
  return fallback;
}

function buildFallbackRecipeSteps(found, metadata, url, sourceTitle) {
  return [
    {
      title: "Read the TikTok link",
      time: "Import",
      instruction: `FoodFrame found the TikTok ${metadata.type || "link"}${metadata.authorName ? ` by ${metadata.authorName}` : ""}.`,
      evidence: sourceTitle,
    },
    {
      title: "Detect named ingredients",
      time: "Metadata",
      instruction: found.length
        ? `Added caption clues to the ingredient list: ${found.map((item) => item.name).join(", ")}.`
        : "No clear ingredient names were found in the caption/title.",
      evidence: `Source URL: ${url}`,
    },
    {
      title: "Next backend step",
      time: "AI vision",
      instruction: "Extract video frames server-side, then send the frames to a vision model for visible ingredients and cooking actions.",
      evidence: "This avoids client-side scraping and keeps the import path expandable.",
    },
  ];
}

const recipeActionWords = ["toss", "mix", "stir", "fry", "cook", "bake", "grill", "roast", "squeeze", "add", "pour", "season", "serve", "top"];

function getCaptionSentences(caption) {
  const cleaned = String(caption || "")
    .replace(/#[A-Za-z0-9_]+/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const stepsIndex = cleaned.search(/s\s*t\s*e\s*p\s*s/i);
  const instructionText = stepsIndex >= 0 ? cleaned.slice(stepsIndex) : cleaned;
  const numberedSteps = [...instructionText.matchAll(/\b\d+\.\s*([\s\S]*?)(?=\s+\d+\.|$)/g)]
    .map((match) => match[1].trim())
    .filter((sentence) => sentence.length > 8 && !isRecipeSectionHeader(sentence));
  if (numberedSteps.length) return numberedSteps;
  return instructionText
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 8 && !isRecipeSectionHeader(sentence));
}

function isRecipeSectionHeader(sentence) {
  return /^(your grocery list|produce|protein|seasonings|dairy|steps|recipe is below)/i.test(sentence.trim());
}

function cleanInstruction(sentence) {
  const text = sentence.replace(/\s+/g, " ").trim();
  return text.endsWith(".") ? text : `${text}.`;
}

function getStepTitle(sentence, index) {
  const lower = sentence.toLowerCase();
  if (lower.includes("toss") || lower.includes("mix")) return "Mix ingredients";
  if (lower.includes("season")) return "Season";
  if (lower.includes("fry")) return "Fry";
  if (lower.includes("bake")) return "Bake";
  if (lower.includes("grill")) return "Grill";
  if (lower.includes("squeeze") || lower.includes("top")) return "Finish";
  if (lower.includes("serve")) return "Serve";
  return `Step ${index + 1}`;
}

function normalizeCaption(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/#[a-z0-9_]+/g, " ")
    .replace(/\b\d+\.\s*/g, " ")
    .replace(/[^a-z0-9/.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getIngredientPhrases(text) {
  return text
    .replace(/\s+and\s+(?=(\d|one|two|three|four|five|six|half|¼|½))/g, ", ")
    .replace(/\s+(with|plus)\s+(?=(\d|one|two|three|four|five|six|half|¼|½))/g, ", ")
    .split(/[,.]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function findIngredientPhrase(phrases, keyword) {
  return phrases.find((phrase) => phraseExists(phrase, keyword)) || "";
}

function phraseExists(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[\\s,])${escaped}(s|es)?($|[\\s,])`).test(text);
}

function detectCaptionActions(text) {
  const actionMap = [
    ["chop", "chopped"],
    ["dice", "diced"],
    ["slice", "sliced"],
    ["mix", "mixed"],
    ["whisk", "whisked"],
    ["fry", "fried"],
    ["bake", "baked"],
    ["grill", "grilled"],
    ["pour", "poured"],
    ["season", "seasoned"],
    ["melt", "melted"],
  ];
  return actionMap.filter(([word]) => text.includes(word)).map(([, action]) => action).slice(0, 3);
}

function getCaptionContext(text) {
  return {
    cookingMethod: detectCaptionActions(text).find((action) => ["fried", "baked", "grilled"].includes(action)) || "",
    hasGolden: /\bgolden\b|\bbrowned?\b|\bcrispy\b/.test(text),
    hasSeasoning: /\bseason|salt|pepper|spice|spices\b/.test(text),
  };
}

function detectIngredientActions(item, text, context) {
  const name = item.name.toLowerCase();
  const actions = [];
  if (["chicken", "beef", "eggs", "pasta", "rice"].includes(name) && context.cookingMethod) actions.push(context.cookingMethod);
  if (["salt", "black pepper"].includes(name) || (context.hasSeasoning && ["garlic", "onion"].includes(name))) actions.push("seasoned");
  if (["olive oil", "butter"].includes(name)) actions.push(text.includes("pour") ? "poured" : "heated");
  if (["lemon", "lime"].includes(name)) actions.push("finished");
  if (["garlic", "onion"].includes(name)) actions.push(text.includes("chop") ? "chopped" : "added");
  return [...new Set(actions)].slice(0, 3);
}

function findAmountNearKeyword(text, keyword) {
  const words = text.split(" ");
  const keywordParts = keyword.split(" ");
  const index = words.findIndex((word, i) => keywordParts.every((part, offset) => words[i + offset]?.startsWith(part)));
  if (index < 0) return "";
  const previousWord = words[index - 1] || "";
  const nextWord = words[index + keywordParts.length] || "";
  const secondPreviousWord = words[index - 2] || "";
  const countPattern = /^(\d+(?:\/\d+)?|\d*\.\d+|one|two|three|four|five|six|half|¼|½)$/i;
  const unitPattern = /^(cups?|tbsp|tablespoons?|tsp|teaspoons?|cloves?|pieces?|slices?|lbs?|pounds?|oz|ounces?|grams?|g|kg)$/i;
  const cutPattern = /^(legs?|wings?|breasts?|thighs?|pieces?|slices?|fillets?|tenders?|cloves?)$/i;
  const countBeforeIngredient = previousWord.match(countPattern);
  if (countBeforeIngredient && cutPattern.test(nextWord)) {
    return `${previousWord} ${keyword} ${nextWord}`;
  }
  if (countBeforeIngredient && unitPattern.test(nextWord)) {
    return `${previousWord} ${nextWord} ${keyword}`;
  }
  if (countPattern.test(secondPreviousWord) && unitPattern.test(previousWord)) {
    return `${secondPreviousWord} ${previousWord} ${keyword}`;
  }
  return "";
}

function findAmountForIngredientPhrase(phrase, keyword) {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const qty = "(\\d+(?:/\\d+)?(?:-\\d+(?:/\\d+)?)?|\\d*\\.\\d+|one|two|three|four|five|six|half|¼|½)";
  const units = "(cups?|tbsp|tablespoons?|tsp|teaspoons?|cloves?|pieces?|slices?|lbs?|pounds?|oz|ounces?|grams?|g|kg)";
  const cuts = "(legs?|wings?|breasts?|thighs?|pieces?|slices?|fillets?|tenders?|cloves?)";
  const patterns = [
    new RegExp(`\\b${qty}\\s+${cuts}\\s+${escapedKeyword}\\b`, "i"),
    new RegExp(`\\b${qty}\\s+${escapedKeyword}\\s+${cuts}\\b`, "i"),
    new RegExp(`\\b${qty}\\s+${units}\\s+${escapedKeyword}\\b`, "i"),
    new RegExp(`\\b${qty}\\s+${units}\\s+of\\s+${escapedKeyword}\\b`, "i"),
    new RegExp(`\\b${qty}\\s+${escapedKeyword}\\b`, "i"),
    new RegExp(`\\b${escapedKeyword}\\s+${qty}\\s+${units}\\b`, "i"),
  ];
  for (const pattern of patterns) {
    const match = phrase.match(pattern);
    if (match) return normalizeAmountText(match[0], keyword);
  }
  return "";
}

function normalizeAmountText(match, keyword) {
  return match.replace(/\s+/g, " ").trim();
}

function getFallbackAmount(name) {
  const lowerName = name.toLowerCase();
  if (["salt", "black pepper", "white pepper", "garlic salt", "montreal steak seasoning", "black peppercorns"].includes(lowerName)) return "to taste";
  if (["lemon", "lime"].includes(lowerName)) return "as needed";
  if (["olive oil", "avocado oil", "butter", "salted butter", "garlic and herb butter"].includes(lowerName)) return "amount not shown";
  if (["garlic", "garlic cloves", "onion", "shallot", "fresh rosemary", "chives"].includes(lowerName)) return "amount not shown";
  if (["chicken", "beef", "steak", "new york strip", "eggs", "flour", "rice", "pasta", "cheese", "parmesan cheese", "gold potatoes", "green beans"].includes(lowerName)) return "amount not shown";
  return "amount not shown";
}

function describeIngredientUse(item, amount, actions, context) {
  const name = item.name;
  const lowerName = name.toLowerCase();
  const amountText = amount ? `${amount} is` : `${name} is`;
  if (["chicken", "beef", "steak", "new york strip"].includes(lowerName) && actions.includes("fried")) {
    return `${amountText} the main protein and is fried${context.hasGolden ? " until golden" : ""}.`;
  }
  if (["chicken", "beef", "steak", "new york strip"].includes(lowerName) && actions.includes("baked")) return `${amountText} the main protein and is baked.`;
  if (["chicken", "beef", "steak", "new york strip"].includes(lowerName) && actions.includes("grilled")) return `${amountText} the main protein and is grilled.`;
  if (["steak", "new york strip"].includes(lowerName)) return `${amountText} the main protein and is seared, then rested before serving.`;
  if (lowerName === "beef broth") return `${amountText} used to build the pan sauce.`;
  if (["heavy whipping cream", "sour cream"].includes(lowerName)) return `${amountText} used to make the sauce or potatoes creamy.`;
  if (["gold potatoes"].includes(lowerName)) return `${amountText} boiled until tender and mashed.`;
  if (["green beans"].includes(lowerName)) return `${amountText} served as the vegetable side.`;
  if (["fresh rosemary"].includes(lowerName)) return `${amountText} added while basting for herb flavor.`;
  if (["shallot"].includes(lowerName)) return `${amountText} minced and cooked into the sauce base.`;
  if (["parmesan cheese"].includes(lowerName)) return `${amountText} stirred into the sauce for salty richness.`;
  if (lowerName === "eggs") return `${amountText} used as the egg base for the recipe.`;
  if (lowerName === "flour") return `${amountText} used as the dry base or coating.`;
  if (actions.includes("mixed")) return `${amountText} mixed into the recipe.`;
  if (actions.includes("seasoned") || ["salt", "black pepper", "white pepper", "garlic salt", "montreal steak seasoning", "black peppercorns"].includes(lowerName)) return `${amountText} used to season the dish.`;
  if (["garlic", "garlic cloves"].includes(lowerName)) return `${amountText} added as an aromatic to build flavor.`;
  if (lowerName === "onion") return `${amountText} added as an aromatic base.`;
  if (["lemon", "lime"].includes(lowerName)) return `${amountText} used for brightness at the end or as a squeeze of citrus.`;
  if (["olive oil", "avocado oil"].includes(lowerName)) return `${amountText} used as the oil for the pan.`;
  if (["butter", "salted butter", "garlic and herb butter"].includes(lowerName)) return `${amountText} used as a cooking fat or finishing fat.`;
  return `${amountText} mentioned as part of the recipe.`;
}

const ingredientKeywordMap = [
  { name: "New York Strip", category: "Protein", keywords: ["new york strip"] },
  { name: "Steak", category: "Protein", keywords: ["steak"] },
  { name: "Chicken", category: "Protein", keywords: ["chicken", "drumstick", "wings", "tenders"] },
  { name: "Beef", category: "Protein", keywords: ["beef", "steak", "burger"] },
  { name: "Beef broth", category: "Stock / sauce", keywords: ["beef broth"] },
  { name: "Eggs", category: "Protein / binder", keywords: ["egg", "eggs", "omelet"] },
  { name: "Garlic cloves", category: "Aromatic", keywords: ["garlic cloves", "crushed garlic cloves"] },
  { name: "Garlic", category: "Aromatic", keywords: ["garlic"] },
  { name: "Shallot", category: "Aromatic", keywords: ["shallot", "shallots"] },
  { name: "Onion", category: "Vegetable / aromatic", keywords: ["onion", "shallot"] },
  { name: "Tomato", category: "Vegetable", keywords: ["tomato", "tomatoes"] },
  { name: "Gold potatoes", category: "Starch", keywords: ["gold potatoes", "potatoes"] },
  { name: "Green beans", category: "Vegetable", keywords: ["green beans"] },
  { name: "Chives", category: "Herb", keywords: ["chives"] },
  { name: "Fresh rosemary", category: "Herb", keywords: ["fresh rosemary", "rosemary"] },
  { name: "Lemon", category: "Citrus", keywords: ["lemon", "lime"] },
  { name: "Garlic and herb butter", category: "Dairy / fat", keywords: ["garlic and herb butter"] },
  { name: "Salted butter", category: "Dairy / fat", keywords: ["salted butter"] },
  { name: "Butter", category: "Fat", keywords: ["butter", "ghee"] },
  { name: "Avocado oil", category: "Oil / fat", keywords: ["avocado oil"] },
  { name: "Olive oil", category: "Oil / fat", keywords: ["olive oil", "oil"] },
  { name: "Heavy whipping cream", category: "Dairy", keywords: ["heavy whipping cream", "heavy cream"] },
  { name: "Sour cream", category: "Dairy", keywords: ["sour cream"] },
  { name: "Parmesan cheese", category: "Dairy", keywords: ["parmesan cheese", "parmesan"] },
  { name: "Flour", category: "Dry ingredient", keywords: ["flour", "batter", "dough"] },
  { name: "Rice", category: "Grain", keywords: ["rice"] },
  { name: "Pasta", category: "Grain", keywords: ["pasta", "spaghetti", "noodle"] },
  { name: "Cheese", category: "Dairy", keywords: ["cheese", "mozzarella", "parmesan", "cheddar"] },
  { name: "Montreal steak seasoning", category: "Seasoning", keywords: ["montreal steak seasoning"] },
  { name: "White pepper", category: "Seasoning", keywords: ["white pepper"] },
  { name: "Garlic salt", category: "Seasoning", keywords: ["garlic salt"] },
  { name: "Black peppercorns", category: "Seasoning", keywords: ["black pepper corns", "pepper corns", "peppercorns"] },
  { name: "Salt", category: "Seasoning", keywords: ["salt"] },
  { name: "Black pepper", category: "Seasoning", keywords: ["pepper"] },
];

function renderLoading() {
  app.innerHTML = html`
    <section class="screen">
      <div class="loading-body">
        <div class="scanner"></div>
        <div class="title-block">
          <h1>Analyzing</h1>
          <p>Finding key frames, visible ingredients, and cooking actions.</p>
        </div>
        <div class="steps">
          <span>Reading caption amounts and prep words</span>
          <span>Extracting frames</span>
          <span>Checking chopped, poured, mixed, fried, baked actions</span>
          <span>Combining duplicate detections</span>
        </div>
      </div>
    </section>
  `;
}

async function analyzeCookingVideo({ file, trim, videoUrl }) {
  await delay(700);
  void videoUrl;

  try {
    const payload = await requestVideoAnalysis({ file, trim });
    const analysis = normalizeAnalysisPayload(payload);
    const status = payload.backendStatus || {};
    state.importMetadata = {
      title: status.sourceName || file?.name || "Uploaded cooking video",
      authorName: status.aiUsed ? "AI video analysis complete" : "Backend upload received",
      status: status.frameStatus || "Video sent to backend analysis.",
      sourceUrl: "",
    };
    return analysis;
  } catch (error) {
    console.warn("Video analysis fell back to demo result:", error);
    state.importMetadata = {
      title: file?.name || "Uploaded cooking video",
      authorName: "Analysis fallback",
      status: "The local backend could not analyze this upload, so a sample result is shown.",
      sourceUrl: "",
    };
    return {
      ingredients: demoIngredients.map((item) => ({ ...item, actions: [...item.actions] })),
      steps: demoCookingSteps.map((step) => ({ ...step })),
    };
  }
}

async function requestVideoAnalysis({ file, trim }) {
  if (!file) throw new Error("Choose a video before analyzing.");
  const form = new FormData();
  form.append("video", file, file.name || "cooking-video.mp4");
  form.append("trim", JSON.stringify(trim || {}));
  form.append("sourceName", file.name || "Uploaded cooking video");

  const response = await fetch(`${getApiBase()}/api/analyze-video`, {
    method: "POST",
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Video analysis failed.");
  }
  return payload;
}

function getApiBase() {
  if (window.location.protocol === "file:") {
    return window.FOODFRAME_API_BASE || "http://localhost:4178";
  }
  return "";
}

function normalizeAnalysisPayload(payload) {
  const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients : [];
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  return {
    ingredients: ingredients.length ? ingredients.map(normalizeIngredient) : demoIngredients.map((item) => ({ ...item })),
    steps: steps.length ? steps.map(normalizeCookingStep) : demoCookingSteps.map((step) => ({ ...step })),
  };
}

function normalizeIngredient(item) {
  const confidence = ["high", "medium", "low"].includes(item.confidence) ? item.confidence : "low";
  return {
    name: item.name || "Ingredient to review",
    confidence,
    confidenceScore: Number(item.confidenceScore) || (confidence === "high" ? 85 : confidence === "medium" ? 65 : 35),
    amount: item.amount || "Amount not clear",
    category: item.category || "Ingredient",
    state: item.state || "Needs review",
    actions: Array.isArray(item.actions) ? item.actions : splitList(item.actions || "seen"),
    seenAt: item.seenAt || "Video analysis",
    visualEvidence: item.visualEvidence || item.notes || "AI did not include a visual clue.",
    possibleAlternatives: item.possibleAlternatives || "No strong alternative listed.",
    notes: item.notes || "Review this item before saving.",
  };
}

function normalizeCookingStep(step, index) {
  return {
    title: step.title || `Step ${index + 1}`,
    time: step.time || "Video",
    instruction: step.instruction || step.evidence || "Review the video for this step.",
    evidence: step.evidence || "Built from the uploaded video analysis.",
  };
}

function renderResults() {
  app.innerHTML = html`
    <section class="screen">
      <header class="header">
        <div class="title-block">
          <h1>Ingredients</h1>
          <p>Review confidence, edit amounts, then save or share.</p>
        </div>
        <button class="icon-button" type="button" data-action="camera" aria-label="Back to camera">⌂</button>
      </header>
      ${renderImportSource()}
      ${renderConfidenceSummary()}
      <div class="results-list">
        ${state.ingredients.map(renderIngredient).join("")}
      </div>
      <div class="result-actions">
        <button class="primary" type="button" data-action="steps">View steps</button>
        <button class="secondary" type="button" data-action="comments">Taste comments</button>
        <button class="primary" type="button" data-action="save">Save</button>
        <button class="secondary" type="button" data-action="share">Share</button>
        <button class="danger" type="button" data-action="retake">New video</button>
      </div>
      <div id="stepsModal"></div>
      <div id="commentsModal"></div>
    </section>
  `;

  document.querySelector("[data-action='camera']").addEventListener("click", () => setScreen("camera"));
  document.querySelector("[data-action='steps']").addEventListener("click", openStepsModal);
  document.querySelector("[data-action='comments']").addEventListener("click", openCommentsModal);
  document.querySelector("[data-action='save']").addEventListener("click", saveResult);
  document.querySelector("[data-action='share']").addEventListener("click", shareResult);
  document.querySelector("[data-action='retake']").addEventListener("click", retake);
  document.querySelectorAll("[data-index]").forEach((card) => {
    const index = Number(card.dataset.index);
    bindIngredientField(card, index, "name");
    bindIngredientField(card, index, "amount");
  });
}

function renderConfidenceSummary() {
  const total = state.ingredients.length || 1;
  const strong = state.ingredients.filter((item) => item.confidence === "high").length;
  const maybe = state.ingredients.filter((item) => item.confidence === "medium").length;
  const review = state.ingredients.filter((item) => item.confidence === "low").length;
  return html`
    <div class="confidence-panel">
      <div>
        <strong>${strong}/${total} strong matches</strong>
        <p>Strong = amount or ingredient found in the caption. Maybe = named but needs video confirmation.</p>
      </div>
      <div class="confidence-counts">
        <span>${maybe} maybe</span>
        <span>${review} review</span>
      </div>
    </div>
  `;
}

function bindIngredientField(card, index, field, transform = (value) => value) {
  const input = card.querySelector(`[data-field='${field}']`);
  if (!input) return;
  input.addEventListener("input", (event) => {
    state.ingredients[index][field] = transform(event.target.value);
  });
}

function renderImportSource() {
  if (!state.importMetadata) return "";
  const metadata = state.importMetadata;
  const title = cleanTikTokText(metadata.title || "TikTok link", 96);
  const subtitle = cleanTikTokText(metadata.authorName || metadata.status || "TikTok metadata imported", 54);
  const status = metadata.status ? `<p>${escapeHtml(cleanTikTokText(metadata.status, 96))}</p>` : "";
  return html`
    <div class="source-card">
      <span>Imported video</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(subtitle)}</p>
      ${status}
    </div>
  `;
}

function openStepsModal() {
  const modal = document.querySelector("#stepsModal");
  if (!modal) return;
  modal.innerHTML = html`
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Video cooking steps">
      <div class="steps-sheet">
        <div class="sheet-head">
          <div>
            <h2>Simple steps</h2>
            <p>Short version of what the video is doing.</p>
          </div>
          <button class="icon-button" type="button" data-action="close-steps" aria-label="Close steps">×</button>
        </div>
        <ol class="recipe-steps">
          ${state.cookingSteps.map(renderCookingStep).join("")}
        </ol>
      </div>
    </div>
  `;
  modal.querySelector("[data-action='close-steps']").addEventListener("click", closeStepsModal);
  modal.querySelector(".modal-backdrop").addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) closeStepsModal();
  });
}

function openCommentsModal() {
  const modal = document.querySelector("#commentsModal");
  if (!modal) return;
  modal.innerHTML = html`
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Recent taste comments">
      <div class="comments-sheet">
        <div class="sheet-head">
          <div>
            <h2>Taste comments</h2>
            <p>Recent reactions people might leave after trying it.</p>
          </div>
          <button class="icon-button" type="button" data-action="close-comments" aria-label="Close comments">×</button>
        </div>
        <div class="taste-comments">
          ${tasteComments.map(renderTasteComment).join("")}
        </div>
      </div>
    </div>
  `;
  modal.querySelector("[data-action='close-comments']").addEventListener("click", closeCommentsModal);
  modal.querySelector(".modal-backdrop").addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) closeCommentsModal();
  });
}

function closeCommentsModal() {
  const modal = document.querySelector("#commentsModal");
  if (modal) modal.innerHTML = "";
}

function renderTasteComment(comment) {
  return html`
    <article class="taste-comment">
      <div>
        <strong>${escapeHtml(comment.name)}</strong>
        <span>${escapeHtml(comment.time)}</span>
      </div>
      <p>${escapeHtml(comment.text)}</p>
    </article>
  `;
}

function closeStepsModal() {
  const modal = document.querySelector("#stepsModal");
  if (modal) modal.innerHTML = "";
}

function renderCookingStep(step, index) {
  return html`
    <li>
      <div class="step-number">${index + 1}</div>
      <div>
        <strong>${escapeHtml(step.title)}</strong>
        <p>${escapeHtml(step.instruction)}</p>
      </div>
    </li>
  `;
}

function renderIngredient(item, index) {
  const actions = Array.isArray(item.actions) ? item.actions.join(", ") : item.actions || "";
  const confidenceText = formatConfidence(item);
  const category = item.category || "Ingredient";
  const amount = item.amount || "Amount unknown";
  const sourceNote = getIngredientSourceNote(item);
  return html`
    <article class="ingredient" data-index="${index}">
      <div class="ingredient-head">
        <div class="ingredient-icon">${escapeHtml((item.name || "?").slice(0, 1).toUpperCase())}</div>
        <div>
          <input data-field="name" value="${escapeAttr(item.name)}" aria-label="Ingredient name" />
          <span>${escapeHtml(category)}</span>
        </div>
        <span class="confidence ${item.confidence}">${escapeHtml(confidenceText)}</span>
      </div>
      <div class="ingredient-summary">
        <label>
          <span>Amount</span>
          <input data-field="amount" value="${escapeAttr(amount)}" aria-label="Ingredient amount" />
        </label>
      </div>
      <div class="ingredient-tags">
        ${actions ? actions.split(",").slice(0, 3).map((action) => `<span>${escapeHtml(action.trim())}</span>`).join("") : "<span>needs review</span>"}
      </div>
      ${sourceNote ? `<p class="caption-clue">${escapeHtml(sourceNote)}</p>` : ""}
    </article>
  `;
}

function getIngredientSourceNote(item) {
  if (item.seenAt === "TikTok caption" || item.seenAt === "TikTok link metadata") {
    return shortText(item.visualEvidence || item.notes || "", 100);
  }
  if (item.seenAt === "Backend upload" || item.seenAt === "Video analysis") {
    return shortText(item.visualEvidence || item.notes || "", 100);
  }
  return "";
}

function formatConfidence(item) {
  if (item.confidence === "high") return "Strong";
  if (item.confidence === "medium") return "Maybe";
  return "Review";
}

function cleanTikTokText(value, maxLength) {
  return shortText(
    String(value || "")
      .replace(/#[A-Za-z0-9_]+/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/\s+/g, " ")
      .trim() || "TikTok recipe",
    maxLength,
  );
}

function shortText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function addIngredient() {
  state.ingredients.push({
    name: "New ingredient",
    confidence: "low",
    confidenceScore: 0,
    amount: "",
    category: "",
    state: "",
    actions: [],
    seenAt: "",
    visualEvidence: "",
    possibleAlternatives: "",
    notes: "Added manually",
  });
  renderResults();
}

function saveResult() {
  const entry = {
    id: crypto.randomUUID?.() || String(Date.now()),
    createdAt: new Date().toISOString(),
    videoName: state.video?.name || "Cooking video",
    ingredients: state.ingredients.map((item) => ({ ...item })),
    steps: state.cookingSteps.map((step) => ({ ...step })),
    strongCount: state.ingredients.filter((item) => item.confidence === "high").length,
  };
  state.history.unshift(entry);
  state.history = state.history.slice(0, 20);
  saveHistory(state.history);
  setScreen("history");
}

async function shareResult() {
  const text = formatIngredients(state.ingredients);
  if (navigator.share) {
    await navigator.share({ title: "FoodFrame ingredients", text });
  } else {
    await navigator.clipboard?.writeText(text);
    alert("Ingredient list copied.");
  }
}

function renderHistory() {
  app.innerHTML = html`
    <section class="screen">
      <header class="header">
        <div class="title-block">
          <h1>Saved</h1>
          <p>${state.history.length} saved analysis${state.history.length === 1 ? "" : "es"} and ${state.savedRecipes.length} saved recipe${state.savedRecipes.length === 1 ? "" : "s"}.</p>
        </div>
        <button class="icon-button" type="button" data-action="camera" aria-label="Back to camera">⌂</button>
      </header>
      ${
        state.history.length
          ? `<div class="history-list">${state.history.map(renderHistoryItem).join("")}</div>`
          : `<div class="empty"><h2>No saved lists yet</h2><p>Analyze a cooking video, then tap Save.</p></div>`
      }
      <div class="bottom-nav">
        <button class="primary" type="button" data-action="camera">Open camera</button>
        <button class="secondary" type="button" data-action="clear">Clear history</button>
      </div>
    </section>
  `;

  document.querySelectorAll("[data-action='camera']").forEach((button) => button.addEventListener("click", () => setScreen("camera")));
  document.querySelector("[data-action='clear']").addEventListener("click", () => {
    state.history = [];
    saveHistory(state.history);
    renderHistory();
  });
}

function renderHistoryItem(entry) {
  const ingredientNames = entry.ingredients.map((item) => item.name).slice(0, 4).join(", ");
  const remaining = Math.max(0, entry.ingredients.length - 4);
  const title = cleanSavedTitle(entry.videoName);
  return html`
    <article class="history-item">
      <strong>${escapeHtml(title)}</strong>
      <span>${new Date(entry.createdAt).toLocaleString()}</span>
      <span>${escapeHtml(ingredientNames)}${remaining ? ` +${remaining} more` : ""}</span>
      <div class="history-meta">
        <b>${entry.ingredients.length} ingredients</b>
        <b>${entry.steps?.length || 0} steps</b>
        <b>${entry.strongCount || 0} strong</b>
      </div>
    </article>
  `;
}

function cleanSavedTitle(value) {
  const text = cleanTikTokText(value || "Cooking video", 72);
  const recipeName = text.match(/make\s+([^,]+)|let'?s make\s+([^,]+)/i);
  return recipeName ? recipeName[1] || recipeName[2] : text;
}

function formatIngredients(ingredients) {
  const ingredientText = ingredients
    .map((item) => {
      const actions = Array.isArray(item.actions) ? item.actions.join(", ") : item.actions || "not detected";
      return [
        `${item.name} (${item.confidence}${item.confidenceScore ? `, ${item.confidenceScore}%` : ""})`,
        `Amount: ${item.amount || "unknown"}`,
        `Category: ${item.category || "unknown"}`,
        `State: ${item.state || "unknown"}`,
        `Actions: ${actions}`,
        `Seen at: ${item.seenAt || "unknown"}`,
        `Evidence: ${item.visualEvidence || item.notes || "none"}`,
        `Alternatives: ${item.possibleAlternatives || "none"}`,
        `Notes: ${item.notes || "none"}`,
      ].join("\n");
    })
    .join("\n\n");
  const stepText = state.cookingSteps.length
    ? `\n\nSteps:\n${state.cookingSteps.map((step, index) => `${index + 1}. ${step.title} (${step.time}) - ${step.instruction}`).join("\n")}`
    : "";
  return `${ingredientText}${stepText}`;
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("foodframe-history") || localStorage.getItem("cooksnap-history") || "[]");
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem("foodframe-history", JSON.stringify(history));
}

function loadSavedRecipes() {
  try {
    return JSON.parse(localStorage.getItem("foodframe-saved-recipes") || "[]");
  } catch {
    return [];
  }
}

function saveSavedRecipes(recipes) {
  localStorage.setItem("foodframe-saved-recipes", JSON.stringify(recipes));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

render();
