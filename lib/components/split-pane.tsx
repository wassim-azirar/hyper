import React from 'react';
import _ from 'lodash';
import {SplitPaneProps} from '../hyper';

export default class SplitPane extends React.PureComponent<SplitPaneProps, {dragging: boolean}> {
  dragPanePosition!: number;
  dragTarget!: Element;
  panes!: Element[];
  paneIndex!: number;
  d1!: 'height' | 'width';
  d2!: 'top' | 'left';
  d3!: 'clientX' | 'clientY';
  panesSize!: number;
  dragging!: boolean;
  constructor(props: SplitPaneProps) {
    super(props);
    this.state = {dragging: false};
  }

  componentDidUpdate(prevProps: SplitPaneProps) {
    if (this.state.dragging && prevProps.sizes !== this.props.sizes) {
      // recompute positions for ongoing dragging
      this.dragPanePosition = this.dragTarget.getBoundingClientRect()[this.d2];
    }
  }

  setupPanes(ev: any) {
    this.panes = Array.from(ev.target.parentNode.childNodes);
    this.paneIndex = this.panes.indexOf(ev.target);
    this.paneIndex -= Math.ceil(this.paneIndex / 2);
  }

  handleAutoResize = (ev: React.MouseEvent) => {
    ev.preventDefault();

    this.setupPanes(ev);

    const sizes_ = this.getSizes();
    sizes_[this.paneIndex] = 0;
    sizes_[this.paneIndex + 1] = 0;

    const availableWidth = 1 - _.sum(sizes_);
    sizes_[this.paneIndex] = availableWidth / 2;
    sizes_[this.paneIndex + 1] = availableWidth / 2;

    this.props.onResize(sizes_);
  };

  handleDragStart = (ev: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    ev.preventDefault();
    this.setState({dragging: true});
    window.addEventListener('mousemove', this.onDrag);
    window.addEventListener('mouseup', this.onDragEnd);

    // dimensions to consider
    if (this.props.direction === 'horizontal') {
      this.d1 = 'height';
      this.d2 = 'top';
      this.d3 = 'clientY';
    } else {
      this.d1 = 'width';
      this.d2 = 'left';
      this.d3 = 'clientX';
    }

    this.dragTarget = ev.target;
    this.dragPanePosition = this.dragTarget.getBoundingClientRect()[this.d2];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.panesSize = ev.target.parentNode.getBoundingClientRect()[this.d1];
    this.setupPanes(ev);
  };

  getSizes() {
    const {sizes} = this.props;
    let sizes_: number[];

    if (sizes) {
      sizes_ = [...sizes.asMutable()];
    } else {
      const total = (this.props.children as React.ReactNodeArray).length;
      const count = new Array<number>(total).fill(1 / total);

      sizes_ = count;
    }
    return sizes_;
  }

  onDrag = (ev: MouseEvent) => {
    const sizes_ = this.getSizes();

    const i = this.paneIndex;
    const pos = ev[this.d3];
    const d = Math.abs(this.dragPanePosition - pos) / this.panesSize;
    if (pos > this.dragPanePosition) {
      sizes_[i] += d;
      sizes_[i + 1] -= d;
    } else {
      sizes_[i] -= d;
      sizes_[i + 1] += d;
    }
    this.props.onResize(sizes_);
  };

  onDragEnd = () => {
    if (this.state.dragging) {
      window.removeEventListener('mousemove', this.onDrag);
      window.removeEventListener('mouseup', this.onDragEnd);
      this.setState({dragging: false});
    }
  };

  render() {
    const children = this.props.children as React.ReactNodeArray;
    const {direction, borderColor} = this.props;
    const sizeProperty = direction === 'horizontal' ? 'height' : 'width';
    // workaround for the fact that if we don't specify
    // sizes, sometimes flex fails to calculate the
    // right height for the horizontal panes
    const sizes = this.props.sizes || new Array<number>(children.length).fill(1 / children.length);
    return (
      <div className={`splitpane_panes splitpane_panes_${direction}`}>
        {React.Children.map(children, (child, i) => {
          const style = {
            // flexBasis doesn't work for the first horizontal pane, height need to be specified
            [sizeProperty]: `${sizes[i] * 100}%`,
            flexBasis: `${sizes[i] * 100}%`,
            flexGrow: 0
          };
          return [
            <div key="pane" className="splitpane_pane" style={style}>
              {child}
            </div>,
            i < children.length - 1 ? (
              <div
                key="divider"
                onMouseDown={this.handleDragStart}
                onDoubleClick={this.handleAutoResize}
                style={{backgroundColor: borderColor}}
                className={`splitpane_divider splitpane_divider_${direction}`}
              />
            ) : null
          ];
        })}
        <div style={{display: this.state.dragging ? 'block' : 'none'}} className="splitpane_shim" />

        <style jsx>{`
          .splitpane_panes {
            display: flex;
            flex: 1;
            outline: none;
            position: relative;
            width: 100%;
            height: 100%;
          }

          .splitpane_panes_vertical {
            flex-direction: row;
          }

          .splitpane_panes_horizontal {
            flex-direction: column;
          }

          .splitpane_pane {
            flex: 1;
            outline: none;
            position: relative;
          }

          .splitpane_divider {
            box-sizing: border-box;
            z-index: 1;
            background-clip: padding-box;
            flex-shrink: 0;
          }

          .splitpane_divider_vertical {
            border-left: 5px solid rgba(255, 255, 255, 0);
            border-right: 5px solid rgba(255, 255, 255, 0);
            width: 11px;
            margin: 0 -5px;
            cursor: col-resize;
          }

          .splitpane_divider_horizontal {
            height: 11px;
            margin: -5px 0;
            border-top: 5px solid rgba(255, 255, 255, 0);
            border-bottom: 5px solid rgba(255, 255, 255, 0);
            cursor: row-resize;
            width: 100%;
          }

          /*
            this shim is used to make sure mousemove events
            trigger in all the draggable area of the screen
            this is not the case due to hterm's <iframe>
          */
          .splitpane_shim {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: transparent;
          }
        `}</style>
      </div>
    );
  }

  componentWillUnmount() {
    // ensure drag end
    if (this.dragging) {
      this.onDragEnd();
    }
  }
}
