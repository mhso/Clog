def _encode_key(key):
    parts = ["$"]
    split = key.split(".")
    for part in split:
        if "_" in part:
            parts.append(f'"{part}"')
        else:
            parts.append(part)

    return ".".join(parts)

def _encode_val(val):
    try:
        return int(val)
    except ValueError:
        return f"'{val}'"

_KEYWORDS = set(["==", "=", "!=", "<>", "and", "or"])

def pattern_match(tokens, acc, matched_fields):
    if tokens == []:
        return acc, matched_fields

    def match_single():
        match tokens:
            case [key, "==", val, *rest] | [key, "=", val, *rest]:
                matched_fields.append(("key_val", key, str(val)))
                return f"'{_encode_key(key)}'", f"value = {_encode_val(val)}", rest

            case [key, "!=", val, *rest] | [key, "<>", val, *rest]:
                return f"'{_encode_key(key)}'", f"value <> {_encode_val(val)}", rest

            case [keyword, *rest] if keyword.lower() in ("and", "or"):
                return keyword.upper(), None, rest

            case [key, keyword, *rest] if keyword.lower() in _KEYWORDS:
                matched_fields.append(("key", key))
                return f"'{_encode_key(key)}'", None, [keyword] + rest

            case [key, *rest] if rest == []:
                matched_fields.append(("key", key))
                return f"'{_encode_key(key)}'", None, rest

            case raw_tokens:
                raw_text_tokens = []
                for index, token in enumerate(raw_tokens):
                    if token.lower() in _KEYWORDS:
                        index -= 1
                        break

                    raw_text_tokens.append(token)

                raw_text_tokens = " ".join(raw_text_tokens)
                matched_str = f"fullkey LIKE '%{raw_text_tokens}%' OR value LIKE '%{raw_text_tokens}%'"

                matched_fields.append(("text", raw_text_tokens))
                return None, matched_str, raw_tokens[index + 1:]

    json_path_or_keyword, where_clause, rest = match_single()

    acc.append((json_path_or_keyword, where_clause))
    return pattern_match(rest, acc, matched_fields)

def parse_query(query, log_id):
    if not query:
        return [], []

    tokens = query.split(None)
    parsed, fields = pattern_match(tokens, [], [])

    conditions = 1
    joins = []
    unions = []
    sql = ""

    for first, second in parsed:
        if first and first.lower() == "and":
            conditions += 1
            sql += ")"
            joins.append(sql)
        elif first and first.lower() == "or":
            conditions += 1
            sql += ")"
            joins.append(sql)
            unions.append(joins)
            joins = []
        else:
            json_func = f"json_each({log_id}.entry, {first})" if first else f"json_tree({log_id}.entry)"
            where_clause = f"WHERE {second}" if second else ""

            with_clause = "WITH" if conditions == 1 else ""

            sql = f"""
                {with_clause} cond_{conditions} AS (
                    SELECT
                        {log_id}.id,
                        raw_text,
                        entry,
                        timestamp
                    FROM
                        {log_id},
                        {json_func}
                    {where_clause}
            """

    sql += ")"
    joins.append(sql)
    unions.append(joins)

    return unions, fields
