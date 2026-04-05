
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.responses import StreamingResponse


app = FastAPI()
app.mount("/static", StaticFiles(directory="/static"), name="static")
templates = Jinja2Templates(directory="/templates")

@app.get("/")
def index(request:Request):
    return templates.TemplateResponse(
    request=request,
    name="index.html"
)