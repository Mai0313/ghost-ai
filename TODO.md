- 將主程序的 HUD 改成透過 Reactbits 的 Dock 來實作
  - 透過 npx 來 init, 將這個套件存到 `./src/components`
    - `npx jsrepo add https://reactbits.dev/ts/tailwind/Components/Dock`
    - 執行完畢以後 檔案會出現在 `./src/components/Dock`
  - 範例：
    - ```ts
        import Dock from './Dock';

        const items = [
            { icon: <VscHome size={18} />, label: 'Home', onClick: () => alert('Home!') },
            { icon: <VscArchive size={18} />, label: 'Archive', onClick: () => alert('Archive!') },
            { icon: <VscAccount size={18} />, label: 'Profile', onClick: () => alert('Profile!') },
            { icon: <VscSettingsGear size={18} />, label: 'Settings', onClick: () => alert('Settings!') },
        ];

        <Dock
            items={items}
            panelHeight={68}
            baseItemSize={50}
            magnification={70}
        />
      ```
