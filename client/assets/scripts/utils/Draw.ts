export function ensureGraphics(node: cc.Node): cc.Graphics {
    return node.getComponent(cc.Graphics) || node.addComponent(cc.Graphics);
}

/** 以节点中心为原点填充矩形，offsetY 用于把图形画在格子的下半部分等场景。 */
export function fillRect(g: cc.Graphics, width: number, height: number, color: cc.Color, radius = 0, offsetY = 0): void {
    g.fillColor = color;
    if (radius > 0) {
        g.roundRect(-width / 2, -height / 2 + offsetY, width, height, radius);
    } else {
        g.rect(-width / 2, -height / 2 + offsetY, width, height);
    }
    g.fill();
}

export function strokeRect(g: cc.Graphics, width: number, height: number, color: cc.Color, lineWidth = 2): void {
    g.strokeColor = color;
    g.lineWidth = lineWidth;
    g.rect(-width / 2, -height / 2, width, height);
    g.stroke();
}
