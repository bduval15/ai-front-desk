# ai-front-desk

## Structure

- `frontend/`: hosted React app
- `backend-api/`: hosted Node/Express API, Twilio webhooks, Gemini live voice, MongoDB
- `local-formatter/`: local Mistral transcript formatter exposed through ngrok

## Run

- Frontend: `cd frontend && npm start`
- Hosted API locally: `cd backend-api && npm start`
- Local formatter: `cd local-formatter && npm start`

## Deploy

- Render Static Site root: `frontend/`
- Render Web Service root: `backend-api/`
- ngrok tunnel target: `local-formatter` on port `8080`
