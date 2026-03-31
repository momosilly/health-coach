from flask import Flask, request, jsonify 
from datetime import datetime 
import json 
from dotenv import load_dotenv 
import os 
from google import genai 
from google.genai import types

app = Flask(__name__) 
DB_NAME = "health_data"

load_dotenv() 
API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client()

@app.route('/healthdata', methods=['POST']) 
def receive_health_data(): 
    try: 
        data = request.get_json()

        # Extract data
        user_question = data.get('user_note', '')
        steps = data.get('steps_last_24h', 0)
        hr_min = data.get('heart_rate_min', 0)
        hr_max = data.get('heart_rate_max', 0)
        total_calories = data.get('total_calories_burned', 0.0)
        resting_hr = data.get('resting_heart_rate', 0)
        sleep_hours = data.get('sleep_hours', 0.0)
        sleep_sessions = data.get('sleep_sessions', [])
        sleep_stages = data.get('sleep_stages', [])
        exercise_duration = data.get('exercise_duration_minutes', 0)
        exercise_sessions = data.get('exercise_sessions', [])

        response_data = {}
        stage_minutes = {}

        if user_question:
            response_data['user_question'] = user_question
        if steps:
            response_data['steps'] = steps
        if hr_min and hr_max:
            response_data['heart_rate'] = f"{hr_min}-{hr_max}"
        if resting_hr:
            response_data['resting_hr'] = resting_hr
        if total_calories:
            response_data['calories'] = f"{total_calories} cal"
        if exercise_duration:
            response_data['exercise_duration'] = f"{exercise_duration} min"
        if exercise_sessions:
            exercise_sessions_formatted = []
            for session in exercise_sessions:
                exercise_sessions_formatted.append(f" {session.get('title', 'Unknown')}: {session.get('duration_minutes')} min ({session.get('type')}) ")
            response_data['exercise_sessions'] = ", ".join(exercise_sessions_formatted)
        if sleep_hours:
            response_data['sleep_hours'] = sleep_hours
        if sleep_sessions:
            response_data['sleep_sessions'] = len(sleep_sessions)
        if sleep_stages:
            # Calculate total minutes per stage type
            for stage in sleep_stages:
                stage_type = stage.get('type', 'Unknown')
                duration = stage.get('duration_minutes', 0)
                stage_minutes[stage_type] = stage_minutes.get(stage_type, 0) + duration
    
            # Print in a nice order with emojis
            sleep_stages_formatted = []
            stage_order = ['LIGHT', 'DEEP', 'REM', 'AWAKE', 'SLEEPING', 'OUT_OF_BED', 'UNKNOWN']
            for stage_name in stage_order:
                if stage_name in stage_minutes:
                    minutes = stage_minutes[stage_name]
                    sleep_stages_formatted.append(f"{stage_name}: {minutes} min")

            response_data['sleep_stages'] = ", ".join(sleep_stages_formatted)

        def GeminiResponse(): 
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                config=types.GenerateContentConfig(
                    system_instruction="You are a health coach AI"
                ),
                contents=f"The following data represents the user's last 24 hours of health metrics.\n\n {json.dumps(response_data, indent=2)}\n\n User's question: {user_question}\n\n Provide a helpful, motivating, and data-backed answer."
                )
            print(response.text)
            response_data['gemini_insight'] = response.text.strip()

        GeminiResponse()
        return jsonify({
        'status': 'success',
        'data_received': response_data
        }), 200


    except Exception as e:
        print(f"error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

if __name__ == "__main__": 
    port = int(os.environ.get("PORT", 5000)) 
    app.run(host="0.0.0.0", port=port)