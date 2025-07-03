export type TextAlgin = "left" | "center" | "right" | "justify";

export type StyleConfig = {
  body: {
    backgroundColor: string;
    color: string;
    textAlign: TextAlgin;
    lineHeight: number;
  };
  h4: {
    fontSize: number;
  };
  p: {
    fontSize: number;
  };
};

export type Style = StyleConfig & {
  body: {
    padding: number;
    paddingTop: number;
    paddingBottom: number;
  };
  h4: {
    fontWeight: number;
    marginBottom: number;
  };
  p: {
    marginBottom: number;
  };
};

export type GeneralConfig = {
  showProgressSeekBar: boolean;
};
