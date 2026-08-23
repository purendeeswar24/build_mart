# BuildMart — Node monorepo (shop + API + admin)
# Windows: Git Bash `make`, or PowerShell `.\make.ps1 <target>`
# This is not a Python app. `make venv` only creates a local folder reminder.

.DEFAULT_GOAL := help
SHELL := /bin/sh

.PHONY: help venv install up down test test-unit test-dry test-all migrate typecheck

help:
	@echo "BuildMart commands"
	@echo "  make venv       create .venv reminder folder (optional)"
	@echo "  make install    npm install (this is the real setup)"
	@echo "  make up         start API :4000, shop :8081, admin :5173"
	@echo "  make down       stop those processes"
	@echo "  make test       unit tests (no server)"
	@echo "  make test-dry   live hire/bid/bridge dry-run (API must be up)"
	@echo "  make test-all   unit + dry-run"
	@echo "  make migrate    apply database schema"
	@echo "  make typecheck  TypeScript check"

venv:
	@mkdir -p .venv
	@echo "BuildMart uses Node, not pip."
	@echo "Next: make install"
	@echo "Windows activate is not needed. If you created a Python venv anyway:"
	@echo "  .venv\\Scripts\\activate"

install:
	npm install

up:
	node scripts/stack.mjs up

down:
	node scripts/stack.mjs down

test test-unit:
	npm run test:unit --workspace=@buildmart/backend

test-dry:
	npm run test:dry --workspace=@buildmart/backend

test-all: test-unit
	npm run test:dry --workspace=@buildmart/backend

migrate:
	npm run db:migrate

typecheck:
	npm run typecheck --workspaces --if-present
