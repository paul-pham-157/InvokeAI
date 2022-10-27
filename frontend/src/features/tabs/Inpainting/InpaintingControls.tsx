import { useToast } from '@chakra-ui/react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  FaEraser,
  FaPaintBrush,
  FaPalette,
  FaPlus,
  FaRedo,
  FaUndo,
} from 'react-icons/fa';
import { BiHide, BiShow } from 'react-icons/bi';
import { VscSplitHorizontal } from 'react-icons/vsc';
import { RootState, useAppDispatch, useAppSelector } from '../../../app/store';
import IAIIconButton from '../../../common/components/IAIIconButton';
import {
  clearMask,
  redo,
  setMaskColor,
  setBrushSize,
  setMaskOpacity,
  setShouldShowBrushPreview,
  setTool,
  undo,
  setShouldShowMask,
  setShouldInvertMask,
  setNeedsRepaint,
} from './inpaintingSlice';

import { tabMap } from '../InvokeTabs';
import {
  MdInvertColors,
  MdInvertColorsOff,
  MdOutlineCloseFullscreen,
} from 'react-icons/md';
import IAISlider from '../../../common/components/IAISlider';
import IAINumberInput from '../../../common/components/IAINumberInput';
import { inpaintingControlsSelector } from './inpaintingSliceSelectors';
import IAIPopover from '../../../common/components/IAIPopover';
import IAIColorPicker from '../../../common/components/IAIColorPicker';
import { RgbaColor } from 'react-colorful';
import { setShowDualDisplay } from '../../options/optionsSlice';
import { useEffect } from 'react';

const InpaintingControls = () => {
  const {
    tool,
    brushSize,
    maskColor,
    maskOpacity,
    shouldInvertMask,
    shouldShowMask,
    canUndo,
    canRedo,
    isMaskEmpty,
    activeTabName,
    showDualDisplay,
  } = useAppSelector(inpaintingControlsSelector);

  const dispatch = useAppDispatch();
  const toast = useToast();

  // Hotkeys
  useHotkeys(
    '[',
    (e: KeyboardEvent) => {
      e.preventDefault();
      if (brushSize - 5 > 0) {
        handleChangeBrushSize(brushSize - 5);
      } else {
        handleChangeBrushSize(1);
      }
    },
    {
      enabled: activeTabName === 'inpainting' && shouldShowMask,
    },
    [activeTabName, shouldShowMask, brushSize]
  );

  useHotkeys(
    ']',
    (e: KeyboardEvent) => {
      e.preventDefault();
      handleChangeBrushSize(brushSize + 5);
    },
    {
      enabled: activeTabName === 'inpainting' && shouldShowMask,
    },
    [activeTabName, shouldShowMask, brushSize]
  );

  useHotkeys(
    'shift+[',
    (e: KeyboardEvent) => {
      e.preventDefault();
      handleChangeMaskOpacity(Math.max(maskOpacity - 0.05, 0));
    },
    {
      enabled: activeTabName === 'inpainting' && shouldShowMask,
    },
    [activeTabName, shouldShowMask, maskOpacity]
  );

  useHotkeys(
    'shift+]',
    (e: KeyboardEvent) => {
      e.preventDefault();
      handleChangeMaskOpacity(Math.min(maskOpacity + 0.05, 100));
    },
    {
      enabled: activeTabName === 'inpainting' && shouldShowMask,
    },
    [activeTabName, shouldShowMask, maskOpacity]
  );

  useHotkeys(
    'e',
    (e: KeyboardEvent) => {
      e.preventDefault();
      if (activeTabName !== 'inpainting' || !shouldShowMask) return;
      handleSelectEraserTool();
    },
    {
      enabled: activeTabName === 'inpainting' && shouldShowMask,
    },
    [activeTabName, shouldShowMask]
  );

  useHotkeys(
    'b',
    (e: KeyboardEvent) => {
      e.preventDefault();
      handleSelectBrushTool();
    },
    {
      enabled: activeTabName === 'inpainting' && shouldShowMask,
    },
    [activeTabName, shouldShowMask]
  );

  useHotkeys(
    'cmd+z, control+z',
    (e: KeyboardEvent) => {
      e.preventDefault();
      handleUndo();
    },
    {
      enabled: activeTabName === 'inpainting' && shouldShowMask && canUndo,
    },
    [activeTabName, shouldShowMask, canUndo]
  );

  useHotkeys(
    'cmd+shift+z, control+shift+z, control+y, cmd+y',
    (e: KeyboardEvent) => {
      e.preventDefault();
      handleRedo();
    },
    {
      enabled: activeTabName === 'inpainting' && shouldShowMask && canRedo,
    },
    [activeTabName, shouldShowMask, canRedo]
  );

  useHotkeys(
    'h',
    (e: KeyboardEvent) => {
      e.preventDefault();
      handleToggleShouldShowMask();
    },
    {
      enabled: activeTabName === 'inpainting',
    },
    [activeTabName, shouldShowMask]
  );

  useHotkeys(
    'shift+m',
    (e: KeyboardEvent) => {
      e.preventDefault();
      handleToggleShouldInvertMask();
    },
    {
      enabled: activeTabName === 'inpainting' && shouldShowMask,
    },
    [activeTabName, shouldInvertMask, shouldShowMask]
  );

  useHotkeys(
    'shift+c',
    (e: KeyboardEvent) => {
      e.preventDefault();
      handleClearMask();
      toast({
        title: 'Mask Cleared',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
    },
    {
      enabled: activeTabName === 'inpainting' && shouldShowMask && !isMaskEmpty,
    },
    [activeTabName, isMaskEmpty, shouldShowMask]
  );

  useHotkeys(
    'shift+j',
    () => {
      handleDualDisplay();
    },
    [showDualDisplay]
  );

  const handleClearMask = () => {
    dispatch(clearMask());
  };

  const handleSelectEraserTool = () => dispatch(setTool('eraser'));

  const handleSelectBrushTool = () => dispatch(setTool('brush'));

  const handleChangeBrushSize = (v: number) => {
    dispatch(setShouldShowBrushPreview(true));
    dispatch(setBrushSize(v));
  };

  const handleChangeMaskOpacity = (v: number) => {
    dispatch(setMaskOpacity(v));
  };

  const handleToggleShouldShowMask = () =>
    dispatch(setShouldShowMask(!shouldShowMask));

  const handleToggleShouldInvertMask = () =>
    dispatch(setShouldInvertMask(!shouldInvertMask));

  const handleShowBrushPreview = () => {
    dispatch(setShouldShowBrushPreview(true));
  };

  const handleHideBrushPreview = () => {
    dispatch(setShouldShowBrushPreview(false));
  };

  const handleChangeBrushColor = (newColor: RgbaColor) => {
    const { r, g, b, a: maskOpacity } = newColor;
    dispatch(setMaskColor({ r, g, b }));
    dispatch(setMaskOpacity(maskOpacity));
  };

  const handleUndo = () => dispatch(undo());

  const handleRedo = () => dispatch(redo());

  const handleDualDisplay = () => {
    dispatch(setShowDualDisplay(!showDualDisplay));
    dispatch(setNeedsRepaint(true));
  };

  return (
    <div className="inpainting-settings">
      <div className="inpainting-buttons">
        <div className="inpainting-buttons-group">
          <IAIPopover
            trigger="hover"
            onOpen={handleShowBrushPreview}
            onClose={handleHideBrushPreview}
            triggerComponent={
              <IAIIconButton
                aria-label="Brush (B)"
                tooltip="Brush (B)"
                icon={<FaPaintBrush />}
                onClick={handleSelectBrushTool}
                data-selected={tool === 'brush'}
                isDisabled={!shouldShowMask}
              />
            }
          >
            <div className="inpainting-slider-numberinput">
              <IAISlider
                label="Brush Size"
                value={brushSize}
                onChange={handleChangeBrushSize}
                min={1}
                max={200}
                width="100px"
                focusThumbOnChange={false}
                isDisabled={!shouldShowMask}
              />
              <IAINumberInput
                value={brushSize}
                onChange={handleChangeBrushSize}
                width={'80px'}
                min={1}
                max={999}
                isDisabled={!shouldShowMask}
              />
            </div>
          </IAIPopover>
          <IAIIconButton
            aria-label="Eraser (E)"
            tooltip="Eraser (E)"
            icon={<FaEraser />}
            onClick={handleSelectEraserTool}
            data-selected={tool === 'eraser'}
            isDisabled={!shouldShowMask}
          />
        </div>
        <div className="inpainting-buttons-group">
          <IAIPopover
            trigger="hover"
            triggerComponent={
              <IAIIconButton
                aria-label="Mask Color"
                tooltip="Mask Color"
                icon={<FaPalette />}
                isDisabled={!shouldShowMask}
                cursor={'pointer'}
              />
            }
          >
            <IAIColorPicker
              color={{ ...maskColor, a: maskOpacity }}
              onChange={handleChangeBrushColor}
            />
          </IAIPopover>
          <IAIIconButton
            aria-label="Hide/Show Mask (H)"
            tooltip="Hide/Show Mask (H)"
            data-selected={!shouldShowMask}
            icon={shouldShowMask ? <BiShow size={22} /> : <BiHide size={22} />}
            onClick={handleToggleShouldShowMask}
          />
          <IAIIconButton
            tooltip="Invert Mask Display (Shift+M)"
            aria-label="Invert Mask Display (Shift+M)"
            data-selected={shouldInvertMask}
            icon={
              shouldInvertMask ? (
                <MdInvertColors size={22} />
              ) : (
                <MdInvertColorsOff size={22} />
              )
            }
            onClick={handleToggleShouldInvertMask}
            isDisabled={!shouldShowMask}
          />
        </div>
        <div className="inpainting-buttons-group">
          <IAIIconButton
            aria-label="Undo"
            tooltip="Undo"
            icon={<FaUndo />}
            onClick={handleUndo}
            isDisabled={!canUndo || !shouldShowMask}
          />
          <IAIIconButton
            aria-label="Redo"
            tooltip="Redo"
            icon={<FaRedo />}
            onClick={handleRedo}
            isDisabled={!canRedo || !shouldShowMask}
          />
          <IAIIconButton
            aria-label="Clear Mask (Shift + C)"
            tooltip="Clear Mask (Shift + C)"
            icon={<FaPlus size={18} style={{ transform: 'rotate(45deg)' }} />}
            onClick={handleClearMask}
            isDisabled={isMaskEmpty || !shouldShowMask}
          />
          <IAIIconButton
            aria-label="Split Layout (Shift+J)"
            tooltip="Split Layout (Shift+J)"
            icon={<VscSplitHorizontal />}
            data-selected={showDualDisplay}
            onClick={handleDualDisplay}
          />
        </div>
      </div>
    </div>
  );
};

export default InpaintingControls;
