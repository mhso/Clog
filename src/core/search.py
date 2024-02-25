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

def pattern_match(tokens, acc):
    if tokens == []:
        return acc

    def match_single():
        match tokens:
            case [key, "==", val, *rest] | [key, "=", val, *rest]:
                return f"'{_encode_key(key)}'", f"value = {_encode_val(val)}", rest

            case [key, "!=", val, *rest] | [key, "<>", val, *rest]:
                return f"'{_encode_key(key)}'", f"value <> {_encode_val(val)}", rest

            case [keyword, *rest] if keyword.lower() in ("and", "or"):
                return keyword.upper(), None, rest

            case [key, keyword, *rest] if keyword.lower() in _KEYWORDS:
                return f"'{_encode_key(key)}'", None, [keyword] + rest

            case raw_tokens:
                matched_str = "fullkey LIKE '%"
                for index, token in enumerate(raw_tokens):
                    matched_str += _encode_key(token)

                    if token in _KEYWORDS:
                        break

                return None, matched_str + "%'", raw_tokens[index + 1:]

    json_path, where_clause, rest = match_single()

    acc.append((json_path, where_clause))
    return pattern_match(rest, acc)

def parse_query(query, log_id):
    if not query:
        return None

    tokens = query.split(None)
    parsed = pattern_match(tokens, [])

    conditions = 1
    joins = []
    unions = []
    sql = ""

    for first, second in parsed:
        if first == "AND":
            conditions += 1
            sql += ")"
            joins.append(sql)
        elif first == "OR":
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
                        message,
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

    return unions
