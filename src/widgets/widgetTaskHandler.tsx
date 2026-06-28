import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { clearWidgetConfig } from './config';
import { buildWidget } from './render';

/**
 * Headless task that renders Tesserone's Android widgets. Click handling for
 * tiles uses the native `OPEN_URI` action (deep link into the app), so no
 * WIDGET_CLICK handling is needed here.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(await buildWidget(props.widgetInfo));
      break;
    case 'WIDGET_DELETED':
      await clearWidgetConfig(props.widgetInfo.widgetId);
      break;
    case 'WIDGET_CLICK':
    default:
      break;
  }
}
