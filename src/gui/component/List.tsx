import React, { ReactNode, Ref } from "react";
import classNames from "classnames";

interface ListProps {
  children?: ReactNode;
  className?: string;
  title?: ReactNode;
  innerRef?: Ref<HTMLDivElement>;
  tooltip?: string;
}

export const List: React.FC<ListProps> = ({
  children,
  className,
  title,
  innerRef,
  tooltip,
}) => (
  <>
    {title && <div className="list-title">{title}</div>}
    <div
      ref={innerRef}
      className={classNames("list", className)}
      data-r-tooltip={tooltip}
    >
      {children}
    </div>
  </>
);

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
  innerRef?: Ref<HTMLDivElement>;
}

export const ListItem: React.FC<ListItemProps> = ({
  children,
  selected,
  disabled,
  tooltip,
  className,
  innerRef,
  ...rest
}) => (
  <div
    ref={innerRef}
    className={classNames("list-item", { selected, disabled }, className)}
    data-r-tooltip={tooltip}
    {...rest}
  >
    {children}
  </div>
);

interface ListHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  tooltip?: string;
  className?: string;
  innerRef?: Ref<HTMLDivElement>;
}

export const ListHeader: React.FC<ListHeaderProps> = ({
  children,
  tooltip,
  className,
  innerRef,
  ...rest
}) => (
  <div
    ref={innerRef}
    className={classNames("list-header", className)}
    data-r-tooltip={tooltip}
    {...rest}
  >
    {children}
  </div>
);
