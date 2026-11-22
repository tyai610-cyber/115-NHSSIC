/* V12 補充資料：新增行政大樓穿堂服務台圖面標記及機器手臂不同目的地定位。
 * 穿堂服務台依承辦單位指示位於原 A3 圖第 14、16 號之間，
 * 新增點為原圖兩點中點示意，不代表現場實測入口；原圖與既有 28 服務點不變。
 */
window.GK_V12_MAP_PATCH = {
  serviceDesk: {
    id: "desk",
    displayId: "服",
    markerLabel: "服",
    name: "服務台（穿堂）",
    place: "行政大樓穿堂（原圖 14、16 號之間）",
    category: "大會服務",
    hasPin: true,
    pending: false,
    locationUnmapped: false,
    statusNote: "服務台位於行政大樓穿堂，依承辦單位指定的 14、16 號之間加註；此為圖面中點示意，非原圖印製標記或現場實測入口。",
    source: "承辦單位指定，依原圖 14、16 號標記取中點；不屬於原 A3 圖 01–28 號"
  },
  serviceDeskPin: {
    mapId: "map-00",
    serviceId: "desk",
    x: 34.118,
    y: 35.743,
    verification: "organizer_reference",
    status: "服務台在 14、16 號之間；圖面中點示意，非實測門口",
    source: "承辦單位指定位置；x=(32.176+36.059)/2，y=35.743"
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
