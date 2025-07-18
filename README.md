# VisionFit AI 🏋️‍♂️

An intelligent virtual fitness coach that uses your webcam to analyze exercise form in real-time. Powered by **TensorFlow.js** and **Pose Estimation**, this app counts your reps, tracks your sets, and gives you live feedback to ensure perfect form. The full-stack application includes **Firebase** for user accounts and saving workout history, creating a complete and personalized training experience.

---

## ✨ Key Features

* **Real-time Pose Estimation:** Uses your webcam to track 17 key body points.
* **Automatic Rep & Set Counting:** The app intelligently counts your reps and guides you through multiple sets.
* **Advanced Form Correction:** Provides live feedback on your form, such as squat depth and maintaining a straight back.
* **Audio Feedback:** Announces reps, sets, and rest periods so you don't have to watch the screen.
* **Customizable Workouts:** Set your own target reps and sets for a personalized session.
* **Bilateral Tracking:** Choose to track exercises on either your left or right side.
* **User Accounts:** Secure sign-up and login functionality powered by Firebase Authentication.
* **Workout History:** Automatically saves completed workouts to a Firestore database to track your progress over time.

---

## 🔧 Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **AI/Machine Learning:** **TensorFlow.js** with the **MoveNet** model for pose detection.
* **Backend:** **Firebase** (Authentication for user accounts and Firestore for the database).

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You need a web browser that supports `getUserMedia` (any modern browser like Chrome or Firefox) and a webcam.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    ```
2.  **Navigate to the project directory:**
    ```sh
    cd your-repo-name
    ```
3.  **Set up your Firebase Keys:**
    * Create your own project at the [Firebase Console](https://console.firebase.google.com/).
    * Follow the setup steps from our conversation to enable **Authentication (Email/Password)** and **Firestore Database (in Test Mode)**.
    * Get your unique `firebaseConfig` object from your project settings.
    * Open `script.js` and replace the placeholder `firebaseConfig` object at the top with your own keys.

4.  **Run the application:**
    * The easiest way is to use a local server. If you are using VS Code, install the **Live Server** extension.
    * Right-click on `index.html` and select "Open with Live Server".

---

## 📜 License

This project is licensed under the **CC BY-NC-SA 4.0 License**. See the `LICENSE` file for details.

*or*

This project is licensed under the **MIT License**. See the `LICENSE` file for details.

---

## 🙏 Acknowledgements

* [TensorFlow.js](https://www.tensorflow.org/js)
* [Google Firebase](https://firebase.google.com/)
