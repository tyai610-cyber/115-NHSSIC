/* V12 Draft：補充現場服務文字與外場不同目的地定位。
 * 服務台地點「穿堂」由承辦方提供；原 A3 圖未標示穿堂，故此處不建立虛構座標。
 * 機器手臂技術兩點對應依桃竹苗分署原圖校對：活動中心／行政大樓。
 */
window.GK_V12_MAP_PATCH = {
  serviceDesk: {
    id: "desk",
    markerLabel: "服",
    name: "服務台（穿堂）",
    place: "穿堂",
    category: "大會服務",
    hasPin: false,
    pending: false,
    locationUnmapped: true,
    statusNote: "服務台設於穿堂（承辦方提供）。原始 A3 大會服務導覽圖未標示穿堂，精確圖面位置尚待現場核對；目前的呼吸提示不代表地圖上的實際座標。",
    source: "承辦方新增資訊，非原 A3 圖 01–28 官方編號"
  },
  destinationOverrides: {
    "29": {
      site: "桃竹苗分署",
      mapId: "map-09",
      pointByPlace: {
        "活動中心": {x:78.706,y:53.377},
        "行政大樓": {x:57.765,y:39.085}
      },
      placeByPurpose: {
        registration: "活動中心",
        theory: "行政大樓",
        practical: "活動中心"
      },
      note: "位置對照依桃竹苗分署原圖；兩點均為原圖估位，非實測門口"
    }
  }
};
