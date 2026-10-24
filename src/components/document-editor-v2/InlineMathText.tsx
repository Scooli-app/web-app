"use client";

import type Konva from "konva";
import { useEffect, useState, type ComponentProps } from "react";
import { Shape, Text } from "react-konva";
import { TEXT_LINE_HEIGHT } from "./text-measure";
import { drawInlineMath, hasInlineMath, loadAllInlineMath } from "./inline-math";

type Props = ComponentProps<typeof Text>;

/**
 * Drop-in for Konva `<Text>`: plain text stays a Konva Text; text with inline
 * `$…$` maths is drawn by a Shape that lays out words and rendered formulas.
 */
export function SlideText(props: Props) {
  if (!hasInlineMath(props.text)) return <Text {...props} />;
  return <InlineMathShape {...props} />;
}

function InlineMathShape({
  text = "",
  fontSize = 12,
  fontFamily = "sans-serif",
  fontStyle,
  fill,
  align,
  lineHeight = TEXT_LINE_HEIGHT,
  ...rest
}: Props) {
  const color = typeof fill === "string" ? fill : "#000000";
  const [, setReady] = useState(0);

  useEffect(() => {
    let live = true;
    void loadAllInlineMath(text, color, fontSize).then(() => live && setReady((n) => n + 1));
    return () => {
      live = false;
    };
  }, [text, color, fontSize]);

  return (
    <Shape
      {...(rest as ComponentProps<typeof Shape>)}
      sceneFunc={(context, shape: Konva.Shape) => {
        drawInlineMath(context._context, text, shape.width(), {
          fontSizePx: fontSize,
          fontFamily,
          fontStyle,
          color,
          align,
          lineHeight,
        });
      }}
      hitFunc={(context, shape: Konva.Shape) => {
        context.beginPath();
        context.rect(0, 0, shape.width(), shape.height());
        context.closePath();
        context.fillStrokeShape(shape);
      }}
    />
  );
}
