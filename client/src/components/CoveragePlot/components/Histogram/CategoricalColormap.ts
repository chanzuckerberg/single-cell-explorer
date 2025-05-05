const hexToDec = (hexColor: string): number[] => {
  const decColors = [];
  for (let j = 0; j < 3; j += 1) {
    decColors.push(parseInt(hexColor.slice(j * 2, j * 2 + 2), 16));
  }
  return decColors;
};

const decToHex = (decColor: number[]): string => {
  let hexColor = "#";
  for (let j = 0; j < 3; j += 1) {
    hexColor += decColor[j].toString(16);
  }
  return hexColor;
};

const getLinearColor = (
  startColor: number[],
  endColor: number[],
  k: number
) => {
  const decColor = [];
  for (let j = 0; j < 3; j += 1) {
    decColor.push(
      Math.floor(startColor[j] + k * (endColor[j] - startColor[j]))
    );
  }
  return decColor;
};

export class CategoricalColormap {
  gradients: number[][];

  constructor() {
    const hexColors = [
      "482778",
      "1F968B",
      "55C567",
      "BF1464",
      "E58740",
      "AB4ECC",
    ];
    this.gradients = hexColors.map((c) => hexToDec(c));
  }

  getNScale(n: number) {
    // adhoc scheme of choosing colors
    // 1) select the C limits of the linear gradients in order
    // 2) select central equaltity distributed intermediate colors
    //    of each gradient segment using a round-robin
    if (n === 0) return [];

    const colors = this.gradients
      .slice(0, Math.min(this.gradients.length, n))
      .map((decColor) => decToHex(decColor));

    if (colors.length < n) {
      const colorsPerInterval = Math.floor(
        (n - this.gradients.length) / (this.gradients.length - 1)
      );
      const extraColors =
        (n - this.gradients.length) % (this.gradients.length - 1);
      for (let i = colors.length; i < n; i += 1) {
        const sequenceColor = Math.floor(
          (i - this.gradients.length) / (this.gradients.length - 1)
        );
        const interval =
          (i - this.gradients.length) % (this.gradients.length - 1);
        const step =
          (sequenceColor + 1) /
          (1 + colorsPerInterval + (interval < extraColors ? 1 : 0));

        colors.push(
          decToHex(
            getLinearColor(
              this.gradients[interval],
              this.gradients[interval + 1],
              step
            )
          )
        );
      }
    }
    return colors;
  }
}
