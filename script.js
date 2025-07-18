// --- Your Firebase Configuration ---
const firebaseConfig = {
  apiKey: "Your_API_Id_here",
  authDomain: "ai-workout-69040.firebaseapp.com",
  projectId: "ai-workout-69040",
  storageBucket: "ai-workout-69040.firebasestorage.app",
  messagingSenderId: "59660347543",
  appId: "1:59660347543:web:879dae6c665643dfcba1d2"
};

// --- Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- DOM Elements ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmailElement = document.getElementById('user-email');
const historyList = document.getElementById('history-list');

// --- Authentication Logic ---
signupBtn.addEventListener('click', () => {
    auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(error => alert(error.message));
});

loginBtn.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(error => alert(error.message));
});

logoutBtn.addEventListener('click', () => auth.signOut());

// --- Auth State Listener ---
auth.onAuthStateChanged(user => {
    if (user) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userEmailElement.textContent = user.email;
        runWorkoutApp(user);
    } else {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

// --- WORKOUT APP LOGIC ---
function runWorkoutApp(user) {

    // --- DOM Elements for the App ---
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    const repCounterElement = document.getElementById('rep-counter');
    const feedbackElement = document.getElementById('feedback-text');
    const setCounterElement = document.getElementById('set-counter');
    const bicepCurlBtn = document.getElementById('bicep-curl-btn');
    const squatBtn = document.getElementById('squat-btn');
    const startBtn = document.getElementById('start-btn');
    const repsInput = document.getElementById('reps-input');
    const setsInput = document.getElementById('sets-input');
    const sideRadios = document.querySelectorAll('input[name="side"]');
    const restOverlay = document.getElementById('rest-overlay');
    const restTimeLeftElement = document.getElementById('rest-time-left');

    // --- App State Variables ---
    let detector;
    let repCounter = 0;
    let stage = 'down';
    let currentExercise = 'bicep_curl';
    let currentSet = 0;
    let isResting = false;
    let restTimer;
    let isWorkoutActive = false;
    let trackedSide = 'left';
    let TARGET_REPS = 10;
    let TOTAL_SETS = 3;
    const REST_DURATION = 10;

    // --- App Event Listeners ---
    bicepCurlBtn.addEventListener('click', () => selectExercise('bicep_curl'));
    squatBtn.addEventListener('click', () => selectExercise('squat'));
    startBtn.addEventListener('click', startWorkout);
    sideRadios.forEach(radio => {
        radio.addEventListener('change', (e) => trackedSide = e.target.value);
    });

    function selectExercise(exercise) {
        if (isWorkoutActive) return;
        bicepCurlBtn.classList.toggle('active', exercise === 'bicep_curl');
        squatBtn.classList.toggle('active', exercise === 'squat');
        currentExercise = exercise;
    }

    function startWorkout() {
        TARGET_REPS = parseInt(repsInput.value, 10);
        TOTAL_SETS = parseInt(setsInput.value, 10);
        isWorkoutActive = true;
        currentSet = 1;
        repCounter = 0;
        stage = currentExercise === 'bicep_curl' ? 'down' : 'up';
        
        repsInput.disabled = true;
        setsInput.disabled = true;
        sideRadios.forEach(radio => radio.disabled = true);
        
        speak(`Starting workout. ${currentExercise.replace('_', ' ')}. ${TOTAL_SETS} sets of ${TARGET_REPS} reps.`);
        updateUI();
    }

    function updateUI() {
        repCounterElement.textContent = repCounter;
        setCounterElement.textContent = `${currentSet} / ${TOTAL_SETS}`;
        feedbackElement.textContent = isWorkoutActive ? "Start" : "Ready";
    }

    async function setupCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => resolve(video);
        });
    }

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    }

    function calculateAngle(a, b, c) {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) angle = 360 - angle;
        return angle;
    }

    function drawSkeleton(pose) {
        const keypoints = pose.keypoints;
        const adjacentPairs = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);

        adjacentPairs.forEach(([i, j]) => {
            const kp1 = keypoints[i];
            const kp2 = keypoints[j];
            if (kp1.score > 0.3 && kp2.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(kp1.x, kp1.y);
                ctx.lineTo(kp2.x, kp2.y);
                ctx.strokeStyle = 'lime';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        for (let i = 0; i < keypoints.length; i++) {
            const keypoint = keypoints[i];
            if (keypoint.score > 0.3) {
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'aqua';
                ctx.fill();
            }
        }
    }

    // --- NEW: Function to load workout history ---
    async function loadWorkoutHistory() {
        historyList.innerHTML = ''; // Clear previous list
        const querySnapshot = await db.collection('workouts')
                                    .where('userId', '==', user.uid)
                                    .orderBy('timestamp', 'desc')
                                    .limit(10) // Get the last 10 workouts
                                    .get();

        querySnapshot.forEach(doc => {
            const workout = doc.data();
            const date = workout.timestamp ? workout.timestamp.toDate().toLocaleDateString() : 'No date';
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>
                    <strong>${workout.exercise}</strong>: 
                    ${workout.sets} sets of ${workout.reps} reps
                </span>
                <span class="date">${date}</span>
            `;
            historyList.appendChild(listItem);
        });
    }

    async function saveWorkoutToFirestore() {
        try {
            await db.collection('workouts').add({
                userId: user.uid,
                exercise: currentExercise.replace('_', ' '),
                sets: TOTAL_SETS,
                reps: TARGET_REPS,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            speak("Workout saved successfully.");
            loadWorkoutHistory(); // Refresh history after saving
        } catch (error) {
            console.error("Error saving workout: ", error);
            speak("Sorry, there was an error saving your workout.");
        }
    }

    function startRestPeriod() {
        isResting = true;
        let restTime = REST_DURATION;
        restTimeLeftElement.textContent = restTime;
        restOverlay.classList.remove('hidden');
        speak(`Set ${currentSet} complete. Take a ${REST_DURATION} second rest.`);

        restTimer = setInterval(() => {
            restTime--;
            restTimeLeftElement.textContent = restTime;
            if (restTime <= 3 && restTime > 0) speak(restTime);
            if (restTime <= 0) {
                clearInterval(restTimer);
                currentSet++;
                if (currentSet > TOTAL_SETS) {
                    speak("Workout complete! Great job!");
                    saveWorkoutToFirestore();
                    resetWorkout();
                } else {
                    repCounter = 0;
                    stage = currentExercise === 'bicep_curl' ? 'down' : 'up';
                    isResting = false;
                    restOverlay.classList.add('hidden');
                    updateUI();
                    speak(`Starting set ${currentSet}.`);
                }
            }
        }, 1000);
    }

    function resetWorkout() {
        currentSet = 0;
        repCounter = 0;
        isWorkoutActive = false;
        isResting = false;
        clearInterval(restTimer);
        restOverlay.classList.add('hidden');
        
        repsInput.disabled = false;
        setsInput.disabled = false;
        sideRadios.forEach(radio => radio.disabled = false);

        updateUI();
    }

    function handleRepCount() {
        repCounter++;
        speak(repCounter);
        updateUI();
        if (repCounter >= TARGET_REPS) {
            startRestPeriod();
        }
    }

    function handleBicepCurls(keypoints) {
        const shoulder = keypoints.find(kp => kp.name === `${trackedSide}_shoulder`);
        const elbow = keypoints.find(kp => kp.name === `${trackedSide}_elbow`);
        const wrist = keypoints.find(kp => kp.name === `${trackedSide}_wrist`);

        if (shoulder?.score > 0.3 && elbow?.score > 0.3 && wrist?.score > 0.3) {
            const angle = calculateAngle(shoulder, elbow, wrist);
            feedbackElement.textContent = `Angle: ${Math.round(angle)}`;
            if (angle > 160 && stage === 'up') stage = 'down';
            if (angle < 30 && stage === 'down') {
                stage = 'up';
                handleRepCount();
            }
        }
    }

    function handleSquats(keypoints) {
    const shoulder = keypoints.find(kp => kp.name === `${trackedSide}_shoulder`);
    const hip = keypoints.find(kp => kp.name === `${trackedSide}_hip`);
    const knee = keypoints.find(kp => kp.name === `${trackedSide}_knee`);
    const ankle = keypoints.find(kp => kp.name === `${trackedSide}_ankle`);

    if (hip?.score > 0.3 && knee?.score > 0.3 && ankle?.score > 0.3 && shoulder?.score > 0.3) {
        const kneeAngle = calculateAngle(hip, knee, ankle);
        const backAngle = calculateAngle(shoulder, hip, ankle);

        if (backAngle < 150) {
            feedbackElement.textContent = "Keep Back Straight!";
            return;
        }
        
        if (kneeAngle < 100) {
            feedbackElement.textContent = "Good Depth!";
            if (stage === 'up') {
                stage = 'down'; // THIS WAS THE BUG. It was incorrectly set to 'up'.
            }
        }
        if (kneeAngle > 160 && stage === 'down') {
            stage = 'up';
            feedbackElement.textContent = "Great Rep!";
            handleRepCount();
        }
    }
}

    async function detectPose() {
        if (detector && !isResting) {
            const poses = await detector.estimatePoses(video);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            if (poses && poses.length > 0) {
                drawSkeleton(poses[0]);
                if (isWorkoutActive) {
                    try {
                        const keypoints = poses[0].keypoints;
                        if (currentExercise === 'bicep_curl') handleBicepCurls(keypoints);
                        else if (currentExercise === 'squat') handleSquats(keypoints);
                    } catch (error) {}
                }
            }
        }
        requestAnimationFrame(detectPose);
    }

    async function main() {
        const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
        await setupCamera();
        
        video.width = video.videoWidth;
        video.height = video.videoHeight;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        loadWorkoutHistory(); // Load history when the app starts
        resetWorkout();
        detectPose();
    }
    
    main();
}
