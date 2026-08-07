import json

with open('backend/openapi.json', 'r', encoding='utf-16') as f:
    spec = json.load(f)

paths = spec.get('paths', {})
total = sum(len(methods) for methods in paths.values())

lines = [
    '# Synapse API Reference\n',
    'Generated from FastAPI OpenAPI spec\n',
    f'Total endpoints: {total}\n'
]

for path, methods in sorted(paths.items()):
    for method, details in methods.items():
        tags = details.get('tags', ['untagged'])
        summary = details.get('summary', 'No summary')
        lines.append(f'## {method.upper()} {path}')
        lines.append(f'**Tags:** {", ".join(tags)}')
        lines.append(f'**Summary:** {summary}')

        params = details.get('parameters', [])
        if params:
            lines.append('\n**Parameters:**')
            for p in params:
                req = 'required' if p.get('required') else 'optional'
                lines.append(f'- `{p["name"]}` ({p["in"]}, {req}) - {p.get("description", "")}')

        req_body = details.get('requestBody', {})
        if req_body:
            lines.append('\n**Request Body:**')
            content = req_body.get('content', {})
            for ct, schema in content.items():
                lines.append(f'- Content-Type: `{ct}`')
                ref = schema.get('schema', {}).get('$ref', '')
                if ref:
                    lines.append(f'  Schema: `{ref.split("/")[-1]}`')

        responses = details.get('responses', {})
        if responses:
            lines.append('\n**Responses:**')
            for code, resp in responses.items():
                desc = resp.get('description', '')
                lines.append(f'- `{code}`: {desc}')

        lines.append('\n---')

with open('API_REFERENCE.md', 'w') as f:
    f.write('\n'.join(lines))

print('Done')