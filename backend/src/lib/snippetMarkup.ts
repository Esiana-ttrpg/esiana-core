interface Character {
  value: string;
  index: number;
  previous?: Character;
  next?: Character;
  removed?: boolean;
  bracket?: Character;
  previousBracket?: Character;
  angle?: Character;
  previousAngle?: Character;
  firstSquare?: Character;
  nextSquare?: Character;
  firstImage?: Character;
  nextImage?: Character;
  link?: { opening: Character; closing: Character; paren: Character; deferred: boolean };
  comment?: Character;
  nextQuote?: Character;
  nextClose?: Character;
}

/**
 * Display-only markup reduction. Linked characters let a completed wrapper be
 * unlinked while retaining its label, without copying that label at every depth.
 * Every character is appended once and unlinked at most once. Buffer scans have
 * a fixed order and count independent of nesting depth; cached delimiter links
 * skip removed characters, and join checks inspect only fixed-width prefixes.
 */
export function stripSnippetMarkup(text: string, mode: 'session' | 'mention'): string {
  let head: Character | undefined;
  let tail: Character | undefined;
  let lastSquare: Character | undefined;
  let lastImage: Character | undefined;
  let headingWhitespace = false;
  let rawCommentEnd = text.indexOf('-->');
  let firstFreshSquare: Character | undefined;
  let firstFreshImage: Character | undefined;
  let linkFrontier = 0;
  let hasDeferredLinks = false;
  let tagFrontier = 0;
  let hasDeferredTags = false;

  function latest(node: Character | undefined, kind: 'Bracket' | 'Angle'): Character | undefined {
    const previous = kind === 'Bracket' ? 'previousBracket' : 'previousAngle';
    const skipped: Character[] = [];
    while (node?.removed) {
      skipped.push(node);
      node = node[previous];
    }
    for (const item of skipped) item[previous] = node;
    return node;
  }

  function firstSquare(node: Character | undefined, image = false): Character | undefined {
    const next = image ? 'nextImage' : 'nextSquare';
    const skipped: Character[] = [];
    while (node?.removed) {
      skipped.push(node);
      node = node[next];
    }
    for (const item of skipped) item[next] = node;
    return node;
  }

  function remove(node: Character): void {
    if (node.previous) node.previous.next = node.next;
    else head = node.next;
    if (node.next) node.next.previous = node.previous;
    else tail = node.previous;
    node.removed = true;
  }

  function removeSuffix(start: Character): void {
    let node: Character | undefined = start;
    while (node) {
      const next: Character | undefined = node.next;
      remove(node);
      node = next;
    }
  }

  function removeRange(start: Character, end: Character): void {
    let node: Character | undefined = start;
    while (node) {
      const next: Character | undefined = node.next;
      remove(node);
      if (node === end) break;
      node = next;
    }
  }

  function endsWith(token: string): Character | undefined {
    let node = tail;
    for (let i = token.length - 1; i >= 0; i -= 1) {
      if (node?.value !== token[i]) return undefined;
      if (i === 0) return node;
      node = node.previous;
    }
    return undefined;
  }

  for (let index = 0; index < text.length; index += 1) {
    const value = text[index];
    const node: Character = { value, index, previous: tail };
    node.bracket = latest(tail?.bracket, 'Bracket');
    node.angle = latest(tail?.angle, 'Angle');
    node.firstSquare = firstSquare(tail?.firstSquare);
    node.firstImage = firstSquare(tail?.firstImage, true);
    node.link = tail?.link?.closing.removed ? undefined : tail?.link;
    node.comment = tail?.comment?.removed ? undefined : tail?.comment;
    if (value === '[' || value === ']') {
      node.previousBracket = node.bracket;
      node.bracket = node;
    }
    if (value === '<' || value === '>') {
      node.previousAngle = node.angle;
      node.angle = node;
    }
    if (value === '[') {
      if (lastSquare) lastSquare.nextSquare = node;
      lastSquare = node;
      node.firstSquare ??= node;
      firstFreshSquare ??= node;
      if (tail?.value === '!') {
        if (lastImage) lastImage.nextImage = node;
        lastImage = node;
        node.firstImage ??= node;
        firstFreshImage ??= node;
      }
    }
    if (value === ']') { node.firstSquare = undefined; node.firstImage = undefined; }
    if (value === ')') {
      node.link = undefined;
    }
    if (value === '(' && tail?.value === ']' && (!node.link || node.link.deferred)) {
      let opening = mode === 'mention'
        ? firstSquare(tail.previous?.firstImage, true)
        : firstSquare(tail.previous?.firstSquare);
      // A match in the same source pass cannot start inside the preceding
      // match's retained label. Prefer a new opening if one is available.
      const fresh = mode === 'mention' ? firstSquare(firstFreshImage, true) : firstSquare(firstFreshSquare);
      if (opening && fresh && fresh.index >= opening.index && fresh.index < tail.index) opening = fresh;
      if (opening && (mode === 'mention' || opening.next !== tail)) {
        node.link = { opening, closing: tail, paren: node, deferred: opening.index < linkFrontier };
      }
    }
    const pendingLink = tail?.link;
    if (tail) tail.next = node;
    else head = node;
    tail = node;

    const whitespace = /\s/.test(value);
    if (!whitespace) headingWhitespace = false;

    // A closed source comment is opaque, including Markdown in its body.
    if (mode === 'session') {
      const opening = endsWith('<!--');
      // Reconstructed openers belong to the next normalization phase; Markdown
      // links must finish first so a URL's closing delimiter cannot leak out.
      if (opening && node.index - opening.index === 3) node.comment ??= opening;
      const closing = endsWith('-->');
      const openingEnd = node.comment?.next?.next?.next;
      if (node.comment && closing && openingEnd && closing.index > openingEnd.index) {
        removeSuffix(node.comment);
        continue;
      }
      if (rawCommentEnd >= 0 && rawCommentEnd < index) rawCommentEnd = text.indexOf('-->', index);
      if (node.comment && rawCommentEnd >= index) continue;
    }

    if (mode === 'session' && whitespace && !headingWhitespace && node.previous?.value === '#') {
      let start = node.previous;
      for (let count = 1; count < 6 && start.previous?.value === '#'; count += 1) start = start.previous;
      removeSuffix(start);
      headingWhitespace = true;
      continue;
    }
    if (mode === 'session' && whitespace && headingWhitespace) {
      remove(node);
      continue;
    }

    if (mode === 'session' && (endsWith('**') || endsWith('__'))) {
      removeSuffix(node.previous!);
      continue;
    }
    if (value === ')' && pendingLink && !pendingLink.closing.removed &&
        (mode === 'mention' || pendingLink.paren.next !== node)) {
      if (pendingLink.deferred) {
        // Finish fresh source matches before links exposed inside a prior label.
        hasDeferredLinks = true;
        continue;
      }
      const { opening, closing } = pendingLink;
      // Images and ordinary links both retain their label in mention snippets.
      if (mode === 'mention' && opening.previous?.value === '!') remove(opening.previous);
      remove(opening);
      removeSuffix(closing);
      firstFreshSquare = undefined;
      firstFreshImage = undefined;
      linkFrontier = index + 1;
      continue;
    }
  }

  if (mode === 'mention') drainLinks(false);

  if (mode === 'mention') {
    // As in the original pipeline, strip source tags after links, and editor
    // fragments before tags exposed by an earlier removal.
    let angle: Character | undefined;
    let node = head;
    while (node) {
      const next: Character | undefined = node.next;
      if (node.value === '<' || node.value === '>') node.previousAngle = angle;
      if (node.value === '<') angle = node;
      if (node.value === '>') {
        if (angle?.value === '<' && angle.next !== node) {
          if (angle.index < tagFrontier) {
            hasDeferredTags = true;
            angle = node;
          } else {
            const previous = latest(angle.previousAngle, 'Angle');
            removeRange(angle, node);
            tagFrontier = node.index + 1;
            angle = previous;
          }
        } else angle = node;
      }
      node = next;
    }

    let quote: Character | undefined;
    let close: Character | undefined;
    for (let item = tail; item; item = item.previous) {
      item.nextQuote = quote;
      item.nextClose = close;
      if (item.value === '"') quote = item;
      if (item.value === '>') close = item;
    }
    function following(item: Character | undefined, key: 'nextQuote' | 'nextClose'): Character | undefined {
      const skipped: Character[] = [];
      while (item?.removed) {
        skipped.push(item);
        item = item[key];
      }
      for (const skippedItem of skipped) skippedItem[key] = item;
      return item;
    }
    node = head;
    while (node) {
      let end: Character | undefined = node;
      for (const char of 'data-type="') {
        if (end?.value !== char) { end = undefined; break; }
        if (char !== '"') end = end.next;
      }
      const quote = following(end?.nextQuote, 'nextQuote');
      const close = following(quote?.nextClose, 'nextClose');
      if (end && close) {
        let previous = node.previous;
        const next = close.next;
        removeRange(node, close);
        // Only a fixed-width prefix can be synthesized at this join.
        for (let count = 0; count < 10 && previous?.previous; count += 1) previous = previous.previous;
        node = previous ?? next;
      } else node = node.next;
    }
  }

  if (hasDeferredTags) {
    let angle: Character | undefined;
    let node = head;
    while (node) {
      const next: Character | undefined = node.next;
      if (node.value === '<') angle = node;
      if (node.value === '>') {
        if (angle?.value === '<' && angle.next !== node) {
          const previous = latest(angle.previousAngle, 'Angle');
          removeRange(angle, node);
          angle = previous;
        } else angle = node;
      }
      node = next;
    }
  }

  if (mode === 'session') {
    let comment: Character | undefined;
    let openingEnd: Character | undefined;
    let node = head;
    while (node) {
      const next: Character | undefined = node.next;
      let marker: Character | undefined = node;
      for (let index = 3; index >= 0; index -= 1) {
        if (marker?.value !== '<!--'[index]) { marker = undefined; break; }
        if (index > 0) marker = marker.previous;
      }
      if (!comment && marker) { comment = marker; openingEnd = node; }
      if (comment && node.value === '>' && node.previous?.value === '-' &&
          node.previous.previous?.value === '-' &&
          node.previous.previous.index > openingEnd!.index) {
        let left = comment.previous;
        let right = node.next;
        removeRange(comment, node);
        comment = undefined;
        openingEnd = undefined;
        // Normalize only the newly adjacent boundary, including delimiters
        // exposed by another boundary reduction. No retained label is copied.
        while (left && right) {
          if ((left.value === '*' || left.value === '_') && left.value === right.value) {
            const previous: Character | undefined = left.previous;
            const after: Character | undefined = right.next;
            remove(left);
            remove(right);
            left = previous;
            right = after;
          } else if (left.value === '#' && /\s/.test(right.value)) {
            for (let count = 0; count < 6 && left?.value === '#'; count += 1) {
              const previous: Character | undefined = left.previous;
              remove(left);
              left = previous;
            }
            while (right && /\s/.test(right.value)) {
              const after: Character | undefined = right.next;
              remove(right);
              right = after;
            }
          } else break;
        }
        // A comment opener is four characters wide; only this boundary can
        // have gained an opener behind the cursor.
        let resume = left;
        for (let count = 0; count < 3 && resume?.previous; count += 1) resume = resume.previous;
        node = resume ?? right;
        continue;
      }
      node = next;
    }
  }

  if (mode === 'mention' || hasDeferredLinks) drainLinks();

  function drainLinks(exposed = true): void {
    // Drain exposed wrappers in one traversal of the retained buffer, rather
    // than a new traversal for each nesting level.
    let opening: Character | undefined;
    let label: { opening: Character; closing: Character } | undefined;
    let link: { opening: Character; closing: Character; paren: Character; deferred: boolean } | undefined;
    let frontier = 0;
    let fresh: Character | undefined;
    let node = head;
    while (node) {
      const next: Character | undefined = node.next;
      if (node.value === '[') {
        opening ??= node;
        fresh ??= node;
      }
      if (node.value === ']') {
        label = opening ? { opening, closing: node } : undefined;
        opening = undefined;
      }
      node.firstSquare = opening;
      if (node.value === '(' && label && node.previous === label.closing && (!link || link.deferred) &&
          (mode === 'mention' || label.opening.next !== label.closing)) {
        const selected = fresh && fresh.index >= label.opening.index && fresh.index < label.closing.index
          ? fresh : label.opening;
        link = { opening: selected, closing: label.closing, paren: node,
          deferred: !exposed && selected.index < frontier };
      }
      if (node.value === ')') {
        if (link && (mode === 'mention' || link.paren.next !== node)) {
          if (link.deferred) {
            hasDeferredLinks = true;
            link = undefined;
            node = next;
            continue;
          }
          const retained = link.closing.previous;
          if (mode === 'mention' && link.opening.previous?.value === '!') remove(link.opening.previous);
          remove(link.opening);
          removeRange(link.closing, node);
          const candidate = firstSquare(retained?.firstSquare);
          opening = candidate && candidate.index < link.closing.index ? candidate : undefined;
          label = undefined;
          frontier = node.index + 1;
          fresh = undefined;
        }
        link = undefined;
      }
      node = next;
    }
  }

  if (mode === 'mention') {
    let bracket: Character | undefined;
    let node = head;
    while (node) {
      const next: Character | undefined = node.next;
      if (node.value === '[' || node.value === ']') {
        node.previousBracket = bracket;
        bracket = node;
      }
      if (node.value === ']' && node.previous?.value === ']') {
        const closing = node.previous;
        const opening = latest(closing.previousBracket, 'Bracket');
        if (opening?.value === '[' && opening.previous?.value === '[' && opening.next !== closing) {
          remove(opening.previous);
          remove(opening);
          remove(closing);
          remove(node);
          bracket = latest(opening.previousBracket, 'Bracket');
        }
      }
      node = next;
    }
  }

  const result: string[] = [];
  for (let node = head; node; node = node.next) result.push(node.value);
  return result.join('');
}
