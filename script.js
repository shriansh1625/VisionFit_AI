// --- Firebase Config & Init ---
const firebaseConfig = {
  apiKey: "AIzaSyBlLFT6LUoBtHgj6i1SK6YWapo596H7Cfk",
  authDomain: "ai-workout-69040.firebaseapp.com",
  projectId: "ai-workout-69040",
  storageBucket: "ai-workout-69040.firebasestorage.app",
  messagingSenderId: "59660347543",
  appId: "1:59660347543:web:879dae6c665643dfcba1d2"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Global DOM Elements & State ---
const authContainer = document.getElementById('auth-container'),
      appContainer = document.getElementById('app-container'),
      clickSound = document.getElementById('click-sound'),
      successSound = document.getElementById('success-sound'),
      emailInput = document.getElementById('email-input'),
      passwordInput = document.getElementById('password-input'),
      loginBtn = document.getElementById('login-btn'),
      signupBtn = document.getElementById('signup-btn');

// --- Dynamic Background Effect ---
const bgCanvas = document.getElementById('background-canvas');
const bgCtx = bgCanvas.getContext('2d');
let particles = [];
function setupBackground() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    particles = [];
    let particleCount = window.innerWidth < 768 ? 30 : 70;
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * bgCanvas.width, y: Math.random() * bgCanvas.height,
            vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 2 + 1
        });
    }
}
function animateBackground() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.fillStyle = 'rgba(107, 114, 128, 0.1)';
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > bgCanvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > bgCanvas.height) p.vy *= -1;
        bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2); bgCtx.fill();
    });
    requestAnimationFrame(animateBackground);
}
window.addEventListener('resize', setupBackground);
setupBackground();
animateBackground();

// --- Auth Logic ---
signupBtn.addEventListener('click', () => auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value).catch(error => alert(error.message)));
loginBtn.addEventListener('click', () => auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value).catch(error => alert(error.message)));

auth.onAuthStateChanged(user => {
    if (user) {
        gsap.to("#auth-container", { duration: 0.5, opacity: 0, scale: 0.9, onComplete: () => {
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            gsap.from("#app-container", { duration: 0.8, opacity: 0, y: 30, ease: "power3.out", onComplete: () => runWorkoutApp(user) });
        }});
    } else {
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        gsap.from("#auth-container", { duration: 0.8, opacity: 0, scale: 0.95, ease: "power3.out" });
    }
});

// --- Main App Logic (runs after login) ---
function runWorkoutApp(user) {

    // --- DOM Elements ---
    const allButtons = document.querySelectorAll('#app-container button'),
          userEmailElement = document.getElementById('user-email'), logoutBtn = document.getElementById('logout-btn'),
          workoutView = document.getElementById('workout-view'), dashboardView = document.getElementById('dashboard-view'),
          workoutViewBtn = document.getElementById('workout-view-btn'), dashboardViewBtn = document.getElementById('dashboard-view-btn'),
          video = document.getElementById('webcam'), canvas = document.getElementById('output'), ctx = canvas.getContext('2d'),
          cameraPlaceholder = document.getElementById('camera-placeholder'), exerciseButtonsContainer = document.getElementById('exercise-buttons'),
          micBtn = document.getElementById('mic-btn'), repCounterElement = document.getElementById('rep-counter'), 
          feedbackElement = document.getElementById('feedback-text'), setCounterElement = document.getElementById('set-counter'), 
          repsInput = document.getElementById('reps-input'), setsInput = document.getElementById('sets-input'), 
          sideRadios = document.querySelectorAll('input[name="side"]'), startBtn = document.getElementById('start-btn'),
          restOverlay = document.getElementById('rest-overlay'), restTimeLeftElement = document.getElementById('rest-time-left'),
          historyList = document.getElementById('history-list');

    // --- App State ---
    let detector, isListening = false, isWorkoutActive = false, videoStream = null,
        repCounter = 0, stage = 'down', currentExercise = 'bicep_curl', currentSet = 0,
        isResting = false, restTimer, trackedSide = 'left', historyChart;
    
    // --- Voice Recognition Setup ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true; recognition.lang = 'en-US';
        recognition.onresult = (event) => {
            const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            handleVoiceCommand(command);
        };
        recognition.onerror = (event) => console.error('Speech recognition error:', event.error);
        recognition.onend = () => { isListening = false; micBtn.classList.remove('listening'); };
    } else {
        micBtn.style.display = 'none';
    }

    // --- Helper & Utility Functions ---
    function speak(text) { const utterance = new SpeechSynthesisUtterance(text); speechSynthesis.speak(utterance); }
    function calculateAngle(a, b, c) { const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x); let angle = Math.abs(radians * 180.0 / Math.PI); if (angle > 180.0) angle = 360 - angle; return angle; }
    function drawSkeleton(pose) { const keypoints = pose.keypoints; const adjacentPairs = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet); adjacentPairs.forEach(([i, j]) => { const kp1 = keypoints[i]; const kp2 = keypoints[j]; if (kp1.score > 0.3 && kp2.score > 0.3) { ctx.beginPath(); ctx.moveTo(kp1.x, kp1.y); ctx.lineTo(kp2.x, kp2.y); ctx.strokeStyle = 'lime'; ctx.lineWidth = 2; ctx.stroke(); } }); for (let i = 0; i < keypoints.length; i++) { const keypoint = keypoints[i]; if (keypoint.score > 0.3) { ctx.beginPath(); ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI); ctx.fillStyle = 'aqua'; ctx.fill(); } } }
    
    // --- Camera & State Management ---
    async function setupCamera() { /* ... function code ... */ }
    function stopCamera() { /* ... function code ... */ }
    async function startWorkout() { /* ... function code ... */ }
    function resetWorkout() { /* ... function code ... */ }
    function updateUI(totalSets = setsInput.value) { /* ... function code ... */ }

    // --- Exercise Logic Handlers ---
    function handleRepCount() { /* ... function code ... */ }
    function handleBicepCurls(keypoints) { /* ... function code ... */ }
    function handleSquats(keypoints) { /* ... function code ... */ }
    function handleJumpingJacks(keypoints) { /* ... function code ... */ }

    // --- Main Detection Loop ---
    async function detectPose() { /* ... function code ... */ }

    // --- Firebase & Dashboard Functions ---
    async function saveWorkoutToFirestore() { /* ... function code ... */ }
    async function loadWorkoutHistory() { /* ... function code ... */ }
    async function loadDashboardData() { /* ... function code ... */ }
    function renderHistoryChart(data) { /* ... function code ... */ }

    // --- UI & Event Handlers ---
    function showView(viewName) { /* ... function code ... */ }
    function selectExercise(exercise) { /* ... function code ... */ }
    function handleVoiceCommand(command) { /* ... function code ... */ }
    function toggleVoiceListening() { /* ... function code ... */ }
    function renderExerciseButtons() { /* ... function code ... */ }

    // --- Application Entry Point ---
    async function main() {
        // --- ATTACH EVENT LISTENERS ---
        allButtons.forEach(btn => btn.addEventListener('click', () => { clickSound.currentTime = 0; clickSound.play(); }));
        logoutBtn.addEventListener('click', () => auth.signOut());
        workoutViewBtn.addEventListener('click', () => showView('workout'));
        dashboardViewBtn.addEventListener('click', () => showView('dashboard'));
        micBtn.addEventListener('click', toggleVoiceListening);
        startBtn.addEventListener('click', startWorkout);
        sideRadios.forEach(radio => radio.addEventListener('change', (e) => trackedSide = e.target.value));

        // --- INITIALIZE APP ---
        const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
        canvas.width = 640; canvas.height = 480;
        userEmailElement.textContent = user.email;
        renderExerciseButtons();
        resetWorkout();
        loadDashboardData();
    }
    
    // ==========================================================
    // == PASTE FULL FUNCTION DEFINITIONS BELOW
    // ==========================================================
    
    async function setupCamera() { if (videoStream) return; try { videoStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false }); video.srcObject = videoStream; video.classList.remove('hidden'); cameraPlaceholder.classList.add('hidden'); return new Promise((resolve) => { video.onloadedmetadata = () => resolve(video); }); } catch (error) { console.error("Camera access denied:", error); alert("Camera access is required. Please allow camera permissions."); return null; } }
    function stopCamera() { if (videoStream) { videoStream.getTracks().forEach(track => track.stop()); videoStream = null; video.classList.add('hidden'); cameraPlaceholder.classList.remove('hidden'); } }
    async function startWorkout() { if(isWorkoutActive) return; await setupCamera(); if (!videoStream) return; isWorkoutActive = true; detectPose(); let TARGET_REPS = parseInt(repsInput.value, 10); let TOTAL_SETS = parseInt(setsInput.value, 10); currentSet = 1; repCounter = 0; stage = (currentExercise === 'bicep_curl' || currentExercise === 'jumping_jacks') ? 'down' : 'up'; repsInput.disabled = true; setsInput.disabled = true; sideRadios.forEach(radio => radio.disabled = true); speak(`Starting workout.`); updateUI(TOTAL_SETS); }
    function resetWorkout() { stopCamera(); isWorkoutActive = false; currentSet = 0; repCounter = 0; isResting = false; clearInterval(restTimer); restOverlay.classList.add('hidden'); repsInput.disabled = false; setsInput.disabled = false; sideRadios.forEach(radio => radio.disabled = false); updateUI(); }
    function updateUI(totalSets = setsInput.value) { repCounterElement.textContent = repCounter; setCounterElement.textContent = `${currentSet} / ${totalSets}`; feedbackElement.textContent = isWorkoutActive ? "Start" : "Ready"; }
    function handleRepCount() { const TARGET_REPS = parseInt(repsInput.value, 10); repCounter++; gsap.fromTo(repCounterElement, { scale: 1.5 }, { scale: 1, duration: 0.3, ease: 'bounce.out' }); if (repCounter === TARGET_REPS) { successSound.play(); } else { clickSound.currentTime = 0; clickSound.play(); } updateUI(); if (repCounter >= TARGET_REPS) { startRestPeriod(); } }
    function startRestPeriod() { isResting = true; let restTime = 10; restTimeLeftElement.textContent = restTime; restOverlay.classList.remove('hidden'); speak(`Set ${currentSet} complete. Take a 10 second rest.`); restTimer = setInterval(() => { restTime--; restTimeLeftElement.textContent = restTime; if (restTime <= 3 && restTime > 0) speak(restTime); if (restTime <= 0) { clearInterval(restTimer); currentSet++; const TOTAL_SETS = parseInt(setsInput.value, 10); if (currentSet > TOTAL_SETS) { speak("Workout complete! Great job!"); saveWorkoutToFirestore(); resetWorkout(); } else { repCounter = 0; stage = (currentExercise === 'bicep_curl' || currentExercise === 'jumping_jacks') ? 'down' : 'up'; isResting = false; restOverlay.classList.add('hidden'); updateUI(TOTAL_SETS); speak(`Starting set ${currentSet}.`); } } }, 1000); }
    async function saveWorkoutToFirestore() { const TARGET_REPS = parseInt(repsInput.value, 10); const TOTAL_SETS = parseInt(setsInput.value, 10); try { await db.collection('workouts').add({ userId: user.uid, exercise: currentExercise.replace('_', ' '), sets: TOTAL_SETS, reps: TARGET_REPS, timestamp: firebase.firestore.FieldValue.serverTimestamp() }); speak("Workout saved successfully."); loadDashboardData(); } catch (error) { console.error("Error saving workout: ", error); speak("Sorry, there was an error saving your workout."); } }
    async function loadWorkoutHistory() { historyList.innerHTML = ''; const querySnapshot = await db.collection('workouts').where('userId', '==', user.uid).orderBy('timestamp', 'desc').limit(5).get(); querySnapshot.forEach(doc => { const workout = doc.data(); const date = workout.timestamp ? workout.timestamp.toDate().toLocaleDateString() : 'No date'; const listItem = document.createElement('li'); listItem.innerHTML = `<span class="text-gray-300"><strong>${workout.exercise}</strong>: ${workout.sets} sets of ${workout.reps} reps</span><span class="text-sm text-gray-500">${date}</span>`; historyList.appendChild(listItem); }); }
    async function loadDashboardData() { const querySnapshot = await db.collection('workouts').where('userId', '==', user.uid).orderBy('timestamp', 'desc').get(); let totalWorkouts = 0, totalRps = 0, favExercise = 'N/A'; const exerciseCounts = {}, workoutDataByDate = {}; querySnapshot.forEach(doc => { const workout = doc.data(); totalWorkouts++; totalRps += workout.sets * workout.reps; exerciseCounts[workout.exercise] = (exerciseCounts[workout.exercise] || 0) + 1; if (workout.timestamp) { const date = workout.timestamp.toDate().toLocaleDateString(); workoutDataByDate[date] = (workoutDataByDate[date] || 0) + 1; } }); document.getElementById('total-workouts-stat').textContent = totalWorkouts; document.getElementById('total-reps-stat').textContent = totalRps; if (Object.keys(exerciseCounts).length) { favExercise = Object.keys(exerciseCounts).reduce((a, b) => exerciseCounts[a] > exerciseCounts[b] ? a : b); } document.getElementById('fav-exercise-stat').textContent = favExercise.replace('_', ' '); renderHistoryChart(workoutDataByDate); loadWorkoutHistory(); }
    function renderHistoryChart(data) { const ctx = document.getElementById('history-chart').getContext('2d'); if (historyChart) historyChart.destroy(); historyChart = new Chart(ctx, { type: 'line', data: { labels: Object.keys(data).reverse(), datasets: [{ label: 'Workouts', data: Object.values(data).reverse(), borderColor: 'rgb(99, 102, 241)', backgroundColor: 'rgba(99, 102, 241, 0.1)', fill: true, tension: 0.3 }] }, options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } }); }
    function handleBicepCurls(keypoints) { const shoulder = keypoints.find(kp => kp.name === `${trackedSide}_shoulder`), elbow = keypoints.find(kp => kp.name === `${trackedSide}_elbow`), wrist = keypoints.find(kp => kp.name === `${trackedSide}_wrist`); if (shoulder?.score > 0.3 && elbow?.score > 0.3 && wrist?.score > 0.3) { const angle = calculateAngle(shoulder, elbow, wrist); feedbackElement.textContent = `Angle: ${Math.round(angle)}`; if (angle > 160 && stage === 'up') stage = 'down'; if (angle < 30 && stage === 'down') { stage = 'up'; handleRepCount(); } } }
    function handleSquats(keypoints) { const shoulder = keypoints.find(kp => kp.name === `${trackedSide}_shoulder`), hip = keypoints.find(kp => kp.name === `${trackedSide}_hip`), knee = keypoints.find(kp => kp.name === `${trackedSide}_knee`), ankle = keypoints.find(kp => kp.name === `${trackedSide}_ankle`); if (hip?.score > 0.3 && knee?.score > 0.3 && ankle?.score > 0.3 && shoulder?.score > 0.3) { const kneeAngle = calculateAngle(hip, knee, ankle); const backAngle = calculateAngle(shoulder, hip, ankle); if (backAngle < 150) { feedbackElement.textContent = "Keep Back Straight!"; return; } if (kneeAngle < 100) { feedbackElement.textContent = "Good Depth!"; if (stage === 'up') stage = 'down'; } if (kneeAngle > 160 && stage === 'down') { stage = 'up'; feedbackElement.textContent = "Great Rep!"; handleRepCount(); } } }
    function handleJumpingJacks(keypoints) { const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder'), rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder'), leftAnkle = keypoints.find(kp => kp.name === 'left_ankle'), rightAnkle = keypoints.find(kp => kp.name === 'right_ankle'); if(leftShoulder?.score > 0.3 && rightShoulder?.score > 0.3 && leftAnkle?.score > 0.3 && rightAnkle?.score > 0.3) { const feetApart = Math.abs(leftAnkle.x - rightAnkle.x) > (Math.abs(leftShoulder.x - rightShoulder.x) + 20); if(feetApart && stage === 'down') stage = 'up'; if(!feetApart && stage === 'up') { stage = 'down'; handleRepCount(); } } }
    function selectExercise(exercise) { if (isWorkoutActive) return; currentExercise = exercise; document.querySelectorAll('#exercise-buttons button').forEach(btn => { const isActive = btn.dataset.exercise === exercise; btn.classList.toggle('active', isActive); btn.classList.toggle('bg-indigo-600', isActive); btn.classList.toggle('text-white', isActive); btn.classList.toggle('border-indigo-600', isActive); btn.classList.toggle('bg-transparent', !isActive); btn.classList.toggle('text-gray-300', !isActive); btn.classList.toggle('border-gray-600', !isActive); }); stage = (exercise === 'bicep_curl' || exercise === 'jumping_jacks') ? 'down' : 'up'; }
    function handleVoiceCommand(command) { if (!isWorkoutActive && command.includes('start workout')) { startWorkout(); speak('Starting workout.'); } if (isWorkoutActive && (command.includes('stop workout') || command.includes('end workout'))) { resetWorkout(); speak('Workout stopped.'); } if (!isWorkoutActive) { if (command.includes('select squats')) selectExercise('squat'); else if (command.includes('select curls')) selectExercise('bicep_curl'); else if (command.includes('select jumping jacks')) selectExercise('jumping_jacks'); } }
    function toggleVoiceListening() { if (!recognition) return; if (isListening) { recognition.stop(); } else { try { micBtn.classList.add('listening'); recognition.start(); isListening = true; } catch(e) { console.error("Could not start recognition:", e); micBtn.classList.remove('listening'); } } }
    function renderExerciseButtons() { const exercises = {'bicep_curl': 'Curls', 'squat': 'Squats', 'jumping_jacks': 'Jacks'}; exerciseButtonsContainer.innerHTML = ''; for (const key in exercises) { const btn = document.createElement('button'); btn.textContent = exercises[key]; btn.dataset.exercise = key; btn.className = 'btn-toggle'; if (key === currentExercise) btn.classList.add('active'); btn.addEventListener('click', () => selectExercise(key)); exerciseButtonsContainer.appendChild(btn); } }
    async function detectPose() { if (!isWorkoutActive) return; if (detector && !isResting) { const poses = await detector.estimatePoses(video); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(video, 0, 0, canvas.width, canvas.height); if (poses && poses.length > 0) { drawSkeleton(poses[0]); try { const keypoints = poses[0].keypoints; if (currentExercise === 'bicep_curl') handleBicepCurls(keypoints); else if (currentExercise === 'squat') handleSquats(keypoints); else if (currentExercise === 'jumping_jacks') handleJumpingJacks(keypoints); } catch (error) {} } } requestAnimationFrame(detectPose); }
    
    // Call the main function to start the app logic
    main();
}
