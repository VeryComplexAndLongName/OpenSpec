.PHONY: qa qa-smoke qa-interactive

qa: qa-smoke

qa-smoke:
	node scripts/qa-smoke.mjs

qa-interactive:
	node scripts/qa-interactive.mjs
