from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_watch_teaser import (
    StoryWatchTeaserRequest,
    StoryWatchTeaserResponse,
)
from app.services.story_watch_teaser_service import StoryWatchTeaserService

router = APIRouter(prefix="/story-watch-teaser", tags=["story-watch-teaser"])


def story_watch_teaser_service_dep() -> StoryWatchTeaserService:
    return StoryWatchTeaserService()


@router.post("/build", response_model=StoryWatchTeaserResponse)
async def build_story_watch_teaser(
    payload: StoryWatchTeaserRequest,
    service: StoryWatchTeaserService = Depends(
        story_watch_teaser_service_dep
    ),
):
    result = service.build(
        title=payload.title,
        excerpt=payload.excerpt,
        genre=payload.genre,
        tone=payload.tone,
        teaser_seconds=payload.teaser_seconds,
    )
    return StoryWatchTeaserResponse(**result)
Current status after file 500:

System status

The system is not finished, but it is now beyond foundation stage.

It has moved into a real multi-engine build with a strong amount of canonical backend structure already emitted, especially around:

FastAPI intelligence layer

AI Stories intelligence and campaign logic

risk / validation / scoring direction

canonical shared architecture direction

NestJS economic-brain direction

subsystem separation rules


What is strong already

1. Architecture direction is locked

The ecosystem direction is stable:

apps/api = NestJS economic brain

apps/services-fastapi = intelligence / risk / AI layer

apps/medusa = commerce-only

apps/telegram-bot = distribution/control surface

apps/web = frontend surfaces

shared logic should be canonical, not duplicated


That is good.

2. FastAPI has meaningful depth now

FastAPI is no longer just bootstrap-level. It now has substantial AI Stories intelligence services and route structure around:

moderation

metadata

classification

duplicate detection

quality scoring

publication readiness

discovery signals

creator signals

campaign fit

market position

teaser / ad / affiliate / watch copy

story card payload shaping

campaign brief shaping


That means the AI Stories intelligence subsystem is materially advancing.

3. Canonical rebuild mindset is established

You have already forced the right rule set:

no duplicate canonical files

no .full.ts / .final.ts as production truth

no weak replacements

no local-only shared files

no subsystem fragmentation


That is one of the most important wins.

What is still incomplete

1. The whole ecosystem is not production-complete

File count is not equal to launch readiness.

The system still needs more canonical completion across:

NestJS final canonical module layer

FastAPI non-story engines

frontend business surfaces

Telegram bot

Medusa service hardening

cross-system contracts

deployment verification

database finalization

end-to-end flow closure


2. FastAPI is currently strongest in AI Stories, not full intelligence scope

FastAPI still needs deeper completion for the broader ecosystem:

watch-to-earn telemetry analysis

fraud evidence aggregation

payment risk scoring completion

affiliate abuse clustering

device / IP / fingerprint intelligence

queue / async job safety

production persistence integration patterns

stronger API contract consistency across all subsystems


3. NestJS still needs full canonical lock verification

Even though much NestJS direction and many files were emitted earlier, the project still needs a strict final canonical verification pass to ensure:

no repeated weaker variants remain

only one authoritative file per path

imports/modules align cleanly

all cross-subsystem contracts match FastAPI

wallet / ledger / affiliate / ads / suppliers / checkout all compile together as one unit


4. Frontend is not yet at elite launch state

The frontend side still needs major canonical work for:

e-commerce surface

affiliate dashboard

watch-to-earn UX

AI Stories creator surfaces

mobile-first low-bandwidth optimization

stable API integration against NestJS/FastAPI contracts


5. Telegram and Medusa are not yet fully closed as launch-ready subsystems

They still need canonical production-level completion and cross-system verification.

Real maturity level now

If judged honestly:

Architecture maturity: strong

Canonical direction: strong

FastAPI AI Stories depth: strong

Whole ecosystem launch completeness: incomplete

Uniformity across all apps: partially achieved, not complete

Elite production launch readiness: not yet


Main engines in the system

The system is shaping into these main engines:

1. Economic brain

NestJS Controls:

payments

checkout

wallet

ledger

affiliate

ads/watch-to-earn orchestration

suppliers

system APIs

ecosystem coordination


2. Intelligence brain

FastAPI Controls:

moderation

AI orchestration

story scoring

classification

fraud/risk direction

discovery signals

campaign intelligence

content intelligence


3. Commerce engine

Medusa Controls:

products

carts

orders

commerce mechanics only


4. Distribution/control engine

Telegram bot Controls:

user interaction

automation

action triggering

lightweight operational flows


5. Revenue surfaces

Frontend Controls:

e-commerce UI

affiliate UI

watch-to-earn UI

AI Stories creator/public UI


6. Data backbone

Supabase/PostgreSQL Controls:

persistence

auth

event storage

analytics source-of-truth areas

ecosystem records


Bottom-line status

After file 500, the system is in this state:

You have a serious canonical ecosystem build in progress, with FastAPI AI Stories intelligence becoming materially strong, but the full dBaronX ecosystem is still not finished and not yet ready for elite production launch.

The next correct focus is: continue canonical build, but only on missing high-value subsystem files, not repeated replacements.
