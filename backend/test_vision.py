from dotenv import load_dotenv
import os, base64, io
from PIL import Image, ImageDraw
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv('GROQ_API_KEY'))

# Create test image
img = Image.new('RGB', (400, 200), color=(255, 255, 255))
draw = ImageDraw.Draw(img)
draw.text((20, 80), 'Betaloc 100mg twice daily', fill=(0, 0, 0))
buf = io.BytesIO()
img.save(buf, format='JPEG')
b64 = base64.b64encode(buf.getvalue()).decode()

vision_models = ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview', 'groq/compound', 'qwen/qwen3.6-27b', 'openai/gpt-oss-120b']

for m in vision_models:
    try:
        r = client.chat.completions.create(
            model=m,
            messages=[{
                'role': 'user',
                'content': [
                    {'type': 'text', 'text': 'Read the text in this image and return JSON array: [{"medicine": "name", "dose": "dose", "frequency": "frequency"}]'},
                    {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{b64}'}}
                ]
            }],
            max_tokens=300
        )
        print('SUCCESS VISION MODEL:', m)
        print(r.choices[0].message.content)
        break
    except Exception as e:
        print('FAILED VISION MODEL:', m, e)
